import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenCC from "opencc-js";
import { watchedAnimeSeed } from "../src/data/watchedAnimeSeed.js";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const OUTPUT_PATH = path.resolve("public/data/watched-anime.manifest.json");
const CONCURRENCY = 4;
const MAX_RETRIES = 3;
const converter = OpenCC.Converter({ from: "tw", to: "cn" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadLocalEnvValue(name) {
  const envPath = path.resolve(".env.local");
  let content = "";

  try {
    content = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return "";
    }
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }

    const value = line.slice(separatorIndex + 1).trim();
    return value.replace(/^["']|["']$/gu, "");
  }

  return "";
}

async function requireToken() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim() || (await loadLocalEnvValue("TMDB_READ_ACCESS_TOKEN"));
  if (!token) {
    throw new Error(
      "TMDB_READ_ACCESS_TOKEN is required to generate the watched anime manifest. " +
        "Create a TMDB read access token and run with TMDB_READ_ACCESS_TOKEN=<token>, or put it in .env.local."
    );
  }
  return token;
}

function validateSeed(seed) {
  const validItems = [];
  const errors = [];
  const allowedKeys = new Set(["note", "tmdbType", "tmdbId", "seasonNumber"]);

  seed.forEach((item, index) => {
    const label = `seed[${index}] ${item?.note ? `(${item.note})` : ""}`.trim();
    const itemErrors = [];
    const extraKeys = Object.keys(item ?? {}).filter((key) => !allowedKeys.has(key));

    if (extraKeys.length > 0) {
      itemErrors.push(`${label}: unsupported key(s): ${extraKeys.join(", ")}`);
    }

    if (!item || typeof item.note !== "string" || item.note.trim().length === 0) {
      itemErrors.push(`${label}: note must be a non-empty string`);
    }

    if (item?.tmdbType !== "tv" && item?.tmdbType !== "movie") {
      itemErrors.push(`${label}: tmdbType must be "tv" or "movie"`);
    }

    if (!Number.isInteger(item?.tmdbId) || item.tmdbId <= 0) {
      itemErrors.push(`${label}: tmdbId must be a positive integer`);
    }

    if (
      item?.seasonNumber !== undefined &&
      (item.tmdbType !== "tv" || !Number.isInteger(item.seasonNumber) || item.seasonNumber < 0)
    ) {
      itemErrors.push(`${label}: seasonNumber must be a non-negative integer for tv entries`);
    }

    if (itemErrors.length === 0) {
      validItems.push({
        note: item.note.trim(),
        tmdbType: item.tmdbType,
        tmdbId: item.tmdbId,
        seasonNumber: item.seasonNumber
      });
    } else {
      errors.push(...itemErrors);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Invalid watchedAnimeSeed entries:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return validItems;
}

function parseRetryAfter(value) {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function getResponseBodyText(response) {
  return response.text().catch(() => "");
}

async function fetchTmdbDetail(seed, token, attempt = 1) {
  const detailPath =
    seed.seasonNumber === undefined
      ? `${seed.tmdbType}/${seed.tmdbId}`
      : `tv/${seed.tmdbId}/season/${seed.seasonNumber}`;
  const url = new URL(`${TMDB_API_BASE_URL}/${detailPath}`);
  url.searchParams.set("language", "zh-CN");
  url.searchParams.set("append_to_response", "translations");

  const jitterMs = 80 + Math.floor(Math.random() * 140);
  await sleep(jitterMs);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });
  } catch (error) {
    if (attempt <= MAX_RETRIES) {
      const waitMs = 1000 * attempt + Math.floor(Math.random() * 250);
      console.warn(
        `TMDB fetch failed for ${seed.note} (${seed.tmdbType} ${seed.tmdbId}). ` +
          `Retrying attempt ${attempt}/${MAX_RETRIES} in ${waitMs}ms.`
      );
      await sleep(waitMs);
      return fetchTmdbDetail(seed, token, attempt + 1);
    }
    throw error;
  }

  if (response.status === 429 && attempt <= MAX_RETRIES) {
    const retryAfterMs = parseRetryAfter(response.headers.get("retry-after")) ?? 3000;
    const waitMs = retryAfterMs + Math.floor(Math.random() * 250);
    console.warn(
      `TMDB returned 429 for ${seed.note} (${seed.tmdbType} ${seed.tmdbId}). ` +
        `Retrying attempt ${attempt}/${MAX_RETRIES} in ${waitMs}ms.`
    );
    await sleep(waitMs);
    return fetchTmdbDetail(seed, token, attempt + 1);
  }

  if (!response.ok) {
    const body = await getResponseBodyText(response);
    throw new Error(
      `TMDB request failed for note="${seed.note}" tmdbType=${seed.tmdbType} tmdbId=${seed.tmdbId} ` +
        `with HTTP ${response.status}: ${body}`
    );
  }

  return response.json();
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function toSimplifiedChinese(value) {
  return value ? converter(value) : value;
}

function getTranslations(detail) {
  return Array.isArray(detail?.translations?.translations) ? detail.translations.translations : [];
}

function getTranslationTitle(translation, tmdbType) {
  const data = translation?.data ?? {};
  return tmdbType === "tv" ? data.name : data.title;
}

function getJapaneseTranslationTitle(detail, seed) {
  const jaJp = getTranslations(detail).find(
    (translation) => translation.iso_639_1 === "ja" && translation.iso_3166_1 === "JP"
  );
  return getTranslationTitle(jaJp, seed.tmdbType);
}

function pickLocalizedTitle(detail, seed) {
  const directTitle = seed.tmdbType === "tv" ? detail.name : detail.title;
  if (directTitle) {
    return directTitle;
  }

  const translations = getTranslations(detail);
  const zhCn = translations.find(
    (translation) => translation.iso_639_1 === "zh" && translation.iso_3166_1 === "CN"
  );
  const zhCnTitle = getTranslationTitle(zhCn, seed.tmdbType);
  if (zhCnTitle) {
    return zhCnTitle;
  }

  const traditionalChinese = translations.find(
    (translation) =>
      translation.iso_639_1 === "zh" && ["SG", "MY", "HK", "TW"].includes(translation.iso_3166_1)
  );
  const traditionalTitle = getTranslationTitle(traditionalChinese, seed.tmdbType);
  if (traditionalTitle) {
    return toSimplifiedChinese(traditionalTitle);
  }

  return pickNativeTitle(detail, seed) || seed.note;
}

function pickNativeTitle(detail, seed) {
  const japaneseTitle = seed.seasonNumber === undefined ? "" : getJapaneseTranslationTitle(detail, seed);
  if (japaneseTitle) {
    return japaneseTitle;
  }

  return seed.tmdbType === "tv"
    ? detail.original_name || detail.name || seed.note
    : detail.original_title || detail.title || seed.note;
}

function pickEnglishTitle(detail, seed) {
  const enUs = getTranslations(detail).find(
    (translation) => translation.iso_639_1 === "en" && translation.iso_3166_1 === "US"
  );
  const translatedTitle = getTranslationTitle(enUs, seed.tmdbType);
  if (translatedTitle) {
    return translatedTitle;
  }

  const nativeTitle = pickNativeTitle(detail, seed);
  return /^[\x20-\x7e]+$/u.test(nativeTitle) ? nativeTitle : "";
}

function parseYear(value) {
  const match = typeof value === "string" ? value.match(/^(\d{4})/) : null;
  return match ? Number(match[1]) : null;
}

function createCover(posterPath) {
  if (!posterPath) {
    return {
      extraLarge: "",
      large: "",
      medium: ""
    };
  }

  return {
    extraLarge: `${TMDB_IMAGE_BASE_URL}/w780${posterPath}`,
    large: `${TMDB_IMAGE_BASE_URL}/w500${posterPath}`,
    medium: `${TMDB_IMAGE_BASE_URL}/w342${posterPath}`
  };
}

function createManifestKey(seed, occurrenceIndex) {
  const baseKey =
    seed.seasonNumber === undefined
      ? `tmdb-${seed.tmdbType}-${seed.tmdbId}`
      : `tmdb-${seed.tmdbType}-${seed.tmdbId}-season-${seed.seasonNumber}`;
  return occurrenceIndex > 0 ? `${baseKey}-${occurrenceIndex + 1}` : baseKey;
}

function normalizeDetail(detail, seed, occurrenceIndex) {
  if (!detail.poster_path) {
    console.warn(`Missing poster_path for ${seed.note} (${seed.tmdbType} ${seed.tmdbId}).`);
  }

  const isTv = seed.tmdbType === "tv";
  let dateValue = seed.seasonNumber === undefined
    ? detail.release_date
    : detail.air_date;
  if (isTv && seed.seasonNumber === undefined) {
    dateValue = detail.first_air_date;
  }

  return {
    key: createManifestKey(seed, occurrenceIndex),
    note: seed.note,
    tmdbType: seed.tmdbType,
    tmdbId: seed.tmdbId,
    seasonNumber: seed.seasonNumber,
    title: {
      native: pickNativeTitle(detail, seed),
      localized: pickLocalizedTitle(detail, seed),
      english: pickEnglishTitle(detail, seed)
    },
    cover: createCover(detail.poster_path),
    url:
      seed.seasonNumber === undefined
        ? `https://www.themoviedb.org/${seed.tmdbType}/${seed.tmdbId}`
        : `https://www.themoviedb.org/tv/${seed.tmdbId}/season/${seed.seasonNumber}`,
    meta: {
      format: isTv ? "TV" : "MOVIE",
      status: detail.status ?? null,
      episodes: isTv ? detail.number_of_episodes ?? detail.episodes?.length ?? null : null,
      seasonYear: parseYear(dateValue),
      averageScore: detail.vote_average ? Math.round(detail.vote_average * 10) : null,
      popularity: detail.popularity ?? null,
      isAdult: Boolean(detail.adult)
    }
  };
}

async function main() {
  const token = await requireToken();
  console.log(`Seed item count: ${watchedAnimeSeed.length}`);

  const validSeedItems = validateSeed(watchedAnimeSeed);
  console.log(`Valid item count: ${validSeedItems.length}`);
  console.log(`Request concurrency: ${CONCURRENCY}`);

  if (validSeedItems.length === 0) {
    throw new Error("No valid TMDB seed entries found. Refusing to write an empty manifest.");
  }

  const failures = [];
  const keyOccurrences = new Map();
  const details = await mapWithConcurrency(validSeedItems, CONCURRENCY, async (seed) => {
    try {
      return await fetchTmdbDetail(seed, token);
    } catch (error) {
      const message = `Failed item: note="${seed.note}" tmdbType=${seed.tmdbType} tmdbId=${seed.tmdbId}\n${error.message}`;
      failures.push(message);
      console.error(message);
      return null;
    }
  });

  if (failures.length > 0) {
    throw new Error(`TMDB manifest generation failed for ${failures.length} item(s).`);
  }

  const items = details.map((detail, index) => {
    const seed = validSeedItems[index];
    const key = `${seed.tmdbType}:${seed.tmdbId}:${seed.seasonNumber ?? "series"}`;
    const occurrenceIndex = keyOccurrences.get(key) ?? 0;
    keyOccurrences.set(key, occurrenceIndex + 1);
    return normalizeDetail(detail, seed, occurrenceIndex);
  });

  if (items.length === 0) {
    throw new Error("TMDB returned no usable media. Refusing to write an empty manifest.");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "TMDB",
    count: items.length,
    items
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(`${OUTPUT_PATH}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(`${OUTPUT_PATH}.tmp`, OUTPUT_PATH);

  console.log(`Output manifest path: ${OUTPUT_PATH}`);
  console.log(`Final item count: ${items.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
