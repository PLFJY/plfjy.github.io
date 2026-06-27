import { useState } from "react";

function getCoverUrl(item) {
  return item.cover?.large || item.cover?.medium || item.cover?.extraLarge || "";
}

function AnimeCard({ item, eager = false }) {
  const [hasImageError, setHasImageError] = useState(false);
  const coverUrl = getCoverUrl(item);
  const nativeTitle = item.title?.native || item.title?.romaji || item.note || "Untitled";
  const localizedTitle = item.title?.localized || item.title?.english || item.title?.romaji || item.note || "";
  const accentColor = item.cover?.color || "#4a7bff";
  const showImage = coverUrl && !hasImageError;

  return (
    <article className="anime-card" style={{ "--anime-accent": accentColor }}>
      <div className="anime-cover">
        {showImage ? (
          <img
            src={coverUrl}
            alt={nativeTitle}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="anime-cover-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="anime-card-body">
        <h3>{nativeTitle}</h3>
        <p>{localizedTitle}</p>
      </div>
    </article>
  );
}

export default AnimeCard;
