import { useState } from "react";

function getCoverUrl(item) {
  return item.cover?.large || item.cover?.medium || item.cover?.extraLarge || "";
}

function CoverCard({ item, eager = false }) {
  const [hasImageError, setHasImageError] = useState(false);
  const coverUrl = getCoverUrl(item);
  const title = item.title || "Untitled";
  const subtitle = item.subtitle || "";
  const showImage = coverUrl && !hasImageError;
  const content = (
    <>
      <div className="cover-card-image">
        {showImage ? (
          <img
            src={coverUrl}
            alt={title}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="cover-card-placeholder" aria-hidden="true">
            <span>{title}</span>
          </div>
        )}
      </div>
      <div className="cover-card-body">
        <h3 className="cover-card-title">{title}</h3>
        <p className="cover-card-subtitle">{subtitle}</p>
      </div>
    </>
  );

  if (!item.url) {
    return <div className="cover-card">{content}</div>;
  }

  return (
    <a
      className="cover-card"
      href={item.url}
      target="_blank"
      rel="noreferrer"
      aria-label={subtitle ? `${title} / ${subtitle}` : title}
    >
      {content}
    </a>
  );
}

export { getCoverUrl };
export default CoverCard;
