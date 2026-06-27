import { useEffect, useMemo, useRef, useState } from "react";
import AnimeCard from "./AnimeCard";

const CARD_WIDTH = 174;
const CARD_GAP = 18;

function getCoverUrl(item) {
  return item.cover?.large || item.cover?.medium || item.cover?.extraLarge || "";
}

function AnimeMarqueeCarousel({ items }) {
  const containerRef = useRef(null);
  const [preloadCount, setPreloadCount] = useState(6);
  const [baseRepeatCount, setBaseRepeatCount] = useState(1);

  const baseItems = useMemo(() => {
    if (items.length === 0) {
      return [];
    }
    return Array.from({ length: baseRepeatCount }, () => items).flat();
  }, [baseRepeatCount, items]);

  const trackItems = useMemo(() => [...baseItems, ...baseItems], [baseItems]);

  useEffect(() => {
    const updatePreloadCount = () => {
      const width = containerRef.current?.clientWidth ?? 0;
      const visibleCount = Math.max(1, Math.ceil(width / (CARD_WIDTH + CARD_GAP)));
      setPreloadCount(Math.min(items.length, visibleCount + 3));
      setBaseRepeatCount(Math.max(1, Math.ceil((visibleCount + 3) / Math.max(1, items.length))));
    };

    updatePreloadCount();

    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updatePreloadCount);
      return () => window.removeEventListener("resize", updatePreloadCount);
    }

    const observer = new ResizeObserver(updatePreloadCount);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    items.slice(0, preloadCount).forEach((item) => {
      const coverUrl = getCoverUrl(item);
      if (!coverUrl) {
        return;
      }
      const image = new Image();
      image.decoding = "async";
      image.src = coverUrl;
    });
  }, [items, preloadCount]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="anime-marquee" ref={containerRef}>
      <div className="anime-marquee-track">
        {trackItems.map((item, index) => (
          <AnimeCard key={`${item.key}-${index}`} item={item} eager={index < preloadCount} />
        ))}
      </div>
    </div>
  );
}

export default AnimeMarqueeCarousel;
