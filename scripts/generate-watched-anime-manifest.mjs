import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenCC from "opencc-js";
import { watchedAnimeSeed } from "../src/data/watchedAnimeSeed.js";

const GRAPHQL_ENDPOINT = "https://graphql.anilist.co";
const CHUNK_SIZE = 50;
const OUTPUT_PATH = path.resolve("public/data/watched-anime.manifest.json");
const converter = OpenCC.Converter({ from: "tw", to: "cn" });

const query = `
query WatchedAnimeManifest($ids: [Int], $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      currentPage
      hasNextPage
      perPage
    }
    media(id_in: $ids, type: ANIME) {
      id
      idMal
      title {
        native
        romaji
        english
      }
      synonyms
      coverImage {
        extraLarge
        large
        medium
        color
      }
      siteUrl
      format
      status
      episodes
      seasonYear
      averageScore
      popularity
      isAdult
    }
  }
}
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function looksChinese(value) {
  return (
    typeof value === "string" &&
    /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(value) &&
    !/[\u3040-\u30ff]/u.test(value) &&
    !/[\uac00-\ud7af]/u.test(value) &&
    !/[A-Za-z]/u.test(value)
  );
}

function pickChineseSynonym(synonyms = []) {
  if (!Array.isArray(synonyms)) {
    return null;
  }

  return synonyms.find((synonym) => looksChinese(synonym)) ?? null;
}

function toSimplifiedChinese(value) {
  return value ? converter(value) : value;
}

function normalizeMedia(media, seedById) {
  const chineseSynonym = pickChineseSynonym(media.synonyms);
  const localized =
    toSimplifiedChinese(chineseSynonym) ||
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    seedById.get(media.id)?.note ||
    `AniList ${media.id}`;

  return {
    key: `anilist-${media.id}`,
    note: seedById.get(media.id)?.note ?? "",
    anilistId: media.id,
    malId: media.idMal ?? null,
    title: {
      native: media.title?.native ?? "",
      romaji: media.title?.romaji ?? "",
      english: media.title?.english ?? "",
      localized,
      synonyms: Array.isArray(media.synonyms) ? media.synonyms : []
    },
    cover: {
      extraLarge: media.coverImage?.extraLarge ?? "",
      large: media.coverImage?.large ?? "",
      medium: media.coverImage?.medium ?? "",
      color: media.coverImage?.color ?? null
    },
    url: media.siteUrl || `https://anilist.co/anime/${media.id}`,
    meta: {
      format: media.format ?? null,
      status: media.status ?? null,
      episodes: media.episodes ?? null,
      seasonYear: media.seasonYear ?? null,
      averageScore: media.averageScore ?? null,
      popularity: media.popularity ?? null,
      isAdult: Boolean(media.isAdult)
    }
  };
}

async function requestChunk(ids, attempt = 1) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query,
      variables: {
        ids,
        page: 1,
        perPage: ids.length
      }
    })
  });

  if (response.status === 429 && attempt <= 3) {
    const retryAfter = Number(response.headers.get("retry-after") ?? "3");
    const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 3000;
    console.warn(`AniList returned 429. Retrying chunk in ${waitMs}ms.`);
    await sleep(waitMs);
    return requestChunk(ids, attempt + 1);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      `AniList request failed with HTTP ${response.status}: ${JSON.stringify(payload ?? {})}`
    );
  }

  if (payload?.errors?.length) {
    throw new Error(`AniList GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }

  return payload?.data?.Page?.media ?? [];
}

async function main() {
  const seedItems = watchedAnimeSeed.filter((item) => Number.isInteger(item.anilistId));
  const seedById = new Map(seedItems.map((item) => [item.anilistId, item]));
  const ids = [...new Set(seedItems.map((item) => item.anilistId))];
  const chunks = chunkArray(ids, CHUNK_SIZE);

  console.log(`Loaded ${seedItems.length} seed items (${ids.length} unique AniList IDs).`);
  console.log(`Requesting ${chunks.length} chunk(s) from AniList.`);

  if (ids.length === 0) {
    throw new Error("No AniList IDs found in watchedAnimeSeed. Refusing to generate an empty manifest.");
  }

  const media = [];
  for (const [index, chunk] of chunks.entries()) {
    console.log(`Requesting chunk ${index + 1}/${chunks.length} with ${chunk.length} ID(s).`);
    media.push(...(await requestChunk(chunk)));
  }

  const returnedIds = new Set(media.map((item) => item.id));
  const missingIds = ids.filter((id) => !returnedIds.has(id));
  if (missingIds.length > 0) {
    console.warn(`AniList did not return ${missingIds.length} requested ID(s): ${missingIds.join(", ")}`);
  }

  const mediaById = new Map(media.map((item) => [item.id, item]));
  const items = ids
    .map((id) => mediaById.get(id))
    .filter(Boolean)
    .map((item) => normalizeMedia(item, seedById));

  if (items.length === 0) {
    throw new Error("AniList returned no usable media. Refusing to write an empty manifest.");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "AniList",
    count: items.length,
    items
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(`${OUTPUT_PATH}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(`${OUTPUT_PATH}.tmp`, OUTPUT_PATH);

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Final manifest item count: ${items.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
