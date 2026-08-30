import { useEffect, useMemo, useRef, useState } from "react";
import CoverCard, { getCoverUrl } from "./CoverCard";

const CARD_WIDTH = 174;
const CARD_GAP = 18;

function CoverMarqueeCarousel({ items }) {
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
      setPreloadCount(Math.min(baseItems.length || items.length, visibleCount + 3));
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
  }, [baseItems.length, items.length]);

  useEffect(() => {
    trackItems.slice(0, preloadCount).forEach((item) => {
      const coverUrl = getCoverUrl(item);
      if (!coverUrl) {
        return;
      }
      const image = new Image();
      image.decoding = "async";
      image.src = coverUrl;
    });
  }, [preloadCount, trackItems]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="cover-marquee" ref={containerRef}>
      <div className="cover-marquee-track">
        {trackItems.map((item, index) => (
          <CoverCard key={`${item.key}-${index}`} item={item} eager={index < preloadCount} />
        ))}
      </div>
    </div>
  );
}

export default CoverMarqueeCarousel;
