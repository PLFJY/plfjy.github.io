import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenCC from "opencc-js";
import { gameSeed } from "../src/data/gameSeed.js";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";
const IGDB_IMAGE_BASE_URL = "https://images.igdb.com/igdb/image/upload";
const OUTPUT_PATH = path.resolve("public/data/games.manifest.json");
const MAX_CHUNK_SIZE = 500;
const MAX_RETRIES = 3;
const converter = OpenCC.Converter({ from: "tw", to: "cn" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadLocalEnvValue(name) {
  try {
    const content = await fs.readFile(path.resolve(".env.local"), "utf8");
    for (const rawLine of content.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator === -1 || line.slice(0, separator).trim() !== name) continue;
      return line.slice(separator + 1).trim().replace(/^["']|["']$/gu, "");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return "";
}

async function requireCredentials() {
  const clientId = process.env.IGDB_CLIENT_ID?.trim() || (await loadLocalEnvValue("IGDB_CLIENT_ID"));
  const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim() || (await loadLocalEnvValue("IGDB_CLIENT_SECRET"));
  if (!clientId || !clientSecret) {
    throw new Error(
      "IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required to generate the games manifest. " +
        "Set them in the environment or .env.local."
    );
  }
  return { clientId, clientSecret };
}

function validateSeed(seed) {
  const errors = [];
  const validItems = [];
  const allowedKeys = new Set(["note", "igdbId"]);

  seed.forEach((item, index) => {
    const label = `seed[${index}]${item?.note ? ` (${item.note})` : ""}`;
    const itemErrors = [];
    const extraKeys = Object.keys(item ?? {}).filter((key) => !allowedKeys.has(key));
    if (extraKeys.length > 0) itemErrors.push(`${label}: unsupported key(s): ${extraKeys.join(", ")}`);
    if (typeof item?.note !== "string" || item.note.trim().length === 0) {
      itemErrors.push(`${label}: note must be a non-empty string`);
    }
    if (!Number.isInteger(item?.igdbId) || item.igdbId <= 0) {
      itemErrors.push(`${label}: igdbId must be a positive integer (current value: ${item?.igdbId ?? "missing"})`);
    }
    if (itemErrors.length > 0) errors.push(...itemErrors);
    else validItems.push({ note: item.note.trim(), igdbId: item.igdbId });
  });

  if (errors.length > 0) {
    throw new Error(`Invalid gameSeed entries. Replace placeholder IGDB IDs before production generation:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  return validItems;
}

async function getTwitchAccessToken({ clientId, clientSecret }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });
  const response = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body
  });
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Twitch OAuth request failed at ${TWITCH_TOKEN_URL} with HTTP ${response.status}: ${responseText}`);
  }
  const payload = await response.json();
  if (!payload?.access_token) throw new Error("Twitch OAuth response did not contain an access_token.");
  return payload.access_token;
}

function chunk(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function gamesQuery(ids) {
  return `fields
  id,
  name,
  slug,
  url,
  summary,
  storyline,
  first_release_date,
  rating,
  rating_count,
  total_rating,
  total_rating_count,
  aggregated_rating,
  aggregated_rating_count,
  cover.image_id,
  cover.url,
  cover.width,
  cover.height,
  game_localizations.name,
  game_localizations.region,
  game_localizations.cover.image_id,
  game_localizations.cover.url,
  game_localizations.cover.width,
  game_localizations.cover.height,
  platforms.name,
  genres.name,
  themes.name,
  game_type,
  game_status;
where id = (${ids.join(",")});
limit ${ids.length};`;
}

async function fetchGamesChunk(ids, clientId, accessToken, attempt = 1) {
  let response;
  try {
    response = await fetch(IGDB_GAMES_URL, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      },
      body: gamesQuery(ids)
    });
  } catch (error) {
    if (attempt <= MAX_RETRIES) {
      const waitMs = 1000 * attempt;
      console.warn(`IGDB request failed for IDs [${ids.join(", ")}]; retrying ${attempt}/${MAX_RETRIES} in ${waitMs}ms.`);
      await sleep(waitMs);
      return fetchGamesChunk(ids, clientId, accessToken, attempt + 1);
    }
    throw new Error(`IGDB request failed at ${IGDB_GAMES_URL} for IDs [${ids.join(", ")}]: ${error.message}`);
  }

  if (response.status === 429 && attempt <= MAX_RETRIES) {
    const waitMs = Math.max(1000, Number(response.headers.get("retry-after")) * 1000 || 0);
    console.warn(`IGDB returned HTTP 429 for IDs [${ids.join(", ")}]; retrying ${attempt}/${MAX_RETRIES} in ${waitMs}ms.`);
    await sleep(waitMs);
    return fetchGamesChunk(ids, clientId, accessToken, attempt + 1);
  }
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`IGDB request failed at ${IGDB_GAMES_URL} with HTTP ${response.status} for IDs [${ids.join(", ")}]: ${responseText}`);
  }
  return response.json();
}

function hasHan(value) {
  return /\p{Script=Han}/u.test(value || "");
}

function looksChinese(value) {
  return hasHan(value) && !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(value);
}

function localizedNames(game) {
  return Array.isArray(game?.game_localizations) ? game.game_localizations : [];
}

function pickChineseLocalization(game) {
  const matches = localizedNames(game).filter((localization) => looksChinese(localization?.name));
  return matches.find((localization) => localization.region === 6) || matches[0] || null;
}

function toSimplifiedChinese(value) {
  return hasHan(value) ? converter(value) : value;
}

function pickLocalizedTitle(game, seed) {
  const localization = pickChineseLocalization(game);
  const value = localization?.name || (hasHan(seed.note) ? seed.note : "") || game.name || seed.note;
  return toSimplifiedChinese(value);
}

function pickCoverImageId(game) {
  const localizations = localizedNames(game);
  const preferredLocalization = pickChineseLocalization(game);
  return (
    preferredLocalization?.cover?.image_id ||
    localizations.find((localization) => localization?.cover?.image_id)?.cover?.image_id ||
    game?.cover?.image_id ||
    ""
  );
}

function createCover(imageId) {
  if (!imageId) return { extraLarge: "", large: "", medium: "" };
  return {
    extraLarge: `${IGDB_IMAGE_BASE_URL}/t_cover_big_2x/${imageId}.jpg`,
    large: `${IGDB_IMAGE_BASE_URL}/t_cover_big/${imageId}.jpg`,
    medium: `${IGDB_IMAGE_BASE_URL}/t_cover_small_2x/${imageId}.jpg`
  };
}

function mapNames(values) {
  return Array.isArray(values) ? values.map((value) => value?.name).filter(Boolean) : [];
}

function releaseYear(timestamp) {
  return Number.isFinite(timestamp) ? new Date(timestamp * 1000).getUTCFullYear() : null;
}

function normalizeGame(game, seed) {
  const imageId = pickCoverImageId(game);
  if (!imageId) console.warn(`Missing cover for ${seed.note} (IGDB ${seed.igdbId}); the frontend will use a placeholder.`);
  return {
    key: `igdb-${game.id}`,
    note: seed.note,
    igdbId: game.id,
    title: { name: game.name || seed.note, localized: pickLocalizedTitle(game, seed) },
    cover: createCover(imageId),
    url: game.url || `https://www.igdb.com/games/${game.slug || game.id}`,
    meta: {
      releaseYear: releaseYear(game.first_release_date),
      rating: Number.isFinite(game.rating) ? Math.round(game.rating) : null,
      totalRating: Number.isFinite(game.total_rating) ? Math.round(game.total_rating) : null,
      ratingCount: game.rating_count ?? game.total_rating_count ?? null,
      platforms: mapNames(game.platforms),
      genres: mapNames(game.genres),
      themes: mapNames(game.themes)
    }
  };
}

async function main() {
  console.log(`Seed count: ${gameSeed.length}`);
  console.log(
    `Valid ID count: ${gameSeed.filter((item) => Number.isInteger(item?.igdbId) && item.igdbId > 0).length}`
  );
  const validSeedItems = validateSeed(gameSeed);
  if (validSeedItems.length === 0) throw new Error("No valid IGDB seed entries found. Refusing to write an empty manifest.");

  const ids = [...new Set(validSeedItems.map((item) => item.igdbId))];
  const idChunks = chunk(ids, MAX_CHUNK_SIZE);
  console.log(`Chunk count: ${idChunks.length}`);
  console.log(`Requested IDs: ${ids.join(", ")}`);

  const credentials = await requireCredentials();
  const accessToken = await getTwitchAccessToken(credentials);
  const returnedGames = [];
  for (const idsChunk of idChunks) {
    returnedGames.push(...(await fetchGamesChunk(idsChunk, credentials.clientId, accessToken)));
  }

  const gamesById = new Map(returnedGames.map((game) => [game.id, game]));
  const missingIds = ids.filter((id) => !gamesById.has(id));
  console.log(`Missing IDs returned by IGDB: ${missingIds.length ? missingIds.join(", ") : "none"}`);
  if (missingIds.length > 0) throw new Error(`IGDB did not return requested IDs: ${missingIds.join(", ")}`);

  const items = validSeedItems.map((seed) => normalizeGame(gamesById.get(seed.igdbId), seed));
  if (items.length === 0) throw new Error("IGDB returned no usable games. Refusing to write an empty manifest.");

  const manifest = { generatedAt: new Date().toISOString(), source: "IGDB", count: items.length, items };
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(`${OUTPUT_PATH}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(`${OUTPUT_PATH}.tmp`, OUTPUT_PATH);
  console.log(`Output path: ${OUTPUT_PATH}`);
  console.log(`Final manifest count: ${items.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
