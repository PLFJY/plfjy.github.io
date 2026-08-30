const MANIFEST_PATH = "/data/games.manifest.json";
const DEV_MANIFEST_PATH = "/data/games.manifest.dev.json";

const inlineFallbackItems = [
  {
    key: "igdb-dev-identity-v",
    note: "Identity V / 第五人格",
    igdbId: 0,
    title: { name: "Identity V", localized: "第五人格" },
    cover: { extraLarge: "", large: "", medium: "" },
    url: "",
    meta: { releaseYear: null, rating: null, totalRating: null, ratingCount: null, platforms: [], genres: [], themes: [] }
  },
  {
    key: "igdb-dev-minecraft",
    note: "Minecraft",
    igdbId: 0,
    title: { name: "Minecraft", localized: "Minecraft" },
    cover: { extraLarge: "", large: "", medium: "" },
    url: "",
    meta: { releaseYear: null, rating: null, totalRating: null, ratingCount: null, platforms: [], genres: [], themes: [] }
  },
  {
    key: "igdb-dev-genshin-impact",
    note: "Genshin Impact / 原神",
    igdbId: 0,
    title: { name: "Genshin Impact", localized: "原神" },
    cover: { extraLarge: "", large: "", medium: "" },
    url: "",
    meta: { releaseYear: null, rating: null, totalRating: null, ratingCount: null, platforms: [], genres: [], themes: [] }
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
  return manifest.items.filter((item) => item?.key && item?.title?.name);
}

export async function loadGamesItems() {
  try {
    return await fetchManifest(MANIFEST_PATH);
  } catch (error) {
    if (!import.meta.env.DEV) {
      console.warn("Games manifest could not be loaded.", error);
      return inlineFallbackItems;
    }
    console.warn("Generated games manifest is unavailable; trying dev fallback.", error);
  }

  try {
    return await fetchManifest(DEV_MANIFEST_PATH);
  } catch (error) {
    console.warn("Dev games manifest is unavailable; using inline fallback.", error);
    return inlineFallbackItems;
  }
}

export function shuffleGamesItems(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
