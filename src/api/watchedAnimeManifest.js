const MANIFEST_PATH = "/data/watched-anime.manifest.json";
const DEV_MANIFEST_PATH = "/data/watched-anime.manifest.dev.json";

const inlineFallbackItems = [
  {
    key: "fallback-frieren",
    note: "葬送的芙莉莲",
    anilistId: 154587,
    malId: 52991,
    title: {
      native: "葬送のフリーレン",
      romaji: "Sousou no Frieren",
      english: "Frieren: Beyond Journey’s End",
      localized: "葬送的芙莉莲",
      synonyms: ["葬送的芙莉蓮"]
    },
    cover: {
      large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-qQTzQnEJJ3oB.jpg",
      color: "#bbf1a1"
    },
    url: "https://anilist.co/anime/154587",
    meta: {
      format: "TV",
      status: "FINISHED",
      episodes: 28,
      seasonYear: 2023,
      averageScore: null,
      popularity: null,
      isAdult: false
    }
  }
];

async function fetchManifest(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  const manifest = await response.json();
  if (!Array.isArray(manifest?.items)) {
    throw new Error(`${path} does not contain an items array`);
  }

  return manifest.items;
}

export async function loadWatchedAnimeItems() {
  try {
    return await fetchManifest(MANIFEST_PATH);
  } catch (error) {
    if (!import.meta.env.DEV) {
      console.warn("Watched anime manifest could not be loaded.", error);
      return inlineFallbackItems;
    }

    console.warn("Generated watched anime manifest is unavailable; trying dev fallback.", error);
  }

  try {
    return await fetchManifest(DEV_MANIFEST_PATH);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Dev watched anime manifest is unavailable; using inline fallback.", error);
    }
    return inlineFallbackItems;
  }
}

export function shuffleAnimeItems(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
