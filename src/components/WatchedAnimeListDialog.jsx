import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AnimeCard from "./AnimeCard";

const DESKTOP_PAGE_SIZE = 12;
const MOBILE_PAGE_SIZE = 4;

function WatchedAnimeListDialog({ items, isOpen, onClose }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DESKTOP_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (isOpen) {
      setPage(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const updatePageSize = () => {
      const nextPageSize = window.matchMedia("(max-width: 768px)").matches
        ? MOBILE_PAGE_SIZE
        : DESKTOP_PAGE_SIZE;
      setPageSize(nextPageSize);
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  useEffect(() => {
    setPage((value) => Math.min(value, pageCount));
  }, [pageCount]);

  const visibleItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="anime-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="anime-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anime-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="anime-dialog-header">
          <h2 id="anime-dialog-title">{t("sections.watchedAnime")}</h2>
          <button type="button" className="anime-icon-button" onClick={onClose} aria-label={t("anime.close")}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="anime-dialog-grid">
          {visibleItems.map((item) => (
            <AnimeCard key={item.key} item={item} />
          ))}
        </div>

        <div className="anime-pagination">
          <button type="button" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>
            {t("anime.previous")}
          </button>
          <span>
            {t("anime.page")} {page} / {pageCount}
          </span>
          <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= pageCount}>
            {t("anime.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WatchedAnimeListDialog;
