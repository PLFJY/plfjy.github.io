import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadWatchedAnimeItems, shuffleAnimeItems } from "../api/watchedAnimeManifest";
import CoverListDialog from "./media/CoverListDialog";
import CoverMarqueeCarousel from "./media/CoverMarqueeCarousel";

function WatchedAnimeSection() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadWatchedAnimeItems()
      .then((loadedItems) => {
        if (isMounted) {
          setItems(loadedItems);
        }
      })
      .catch((error) => {
        console.warn("Watched anime data could not be loaded.", error);
        if (isMounted) {
          setItems([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const mediaItems = useMemo(
    () => items.map((item) => ({
      key: item.key,
      title: item.title?.native || item.note || "Untitled",
      subtitle:
        i18n.language === "en-US"
          ? item.title?.english || item.title?.localized || item.title?.native || item.note || ""
          : item.title?.localized || item.title?.english || item.title?.native || item.note || "",
      cover: item.cover,
      url: item.url || (item.tmdbType && item.tmdbId ? `https://www.themoviedb.org/${item.tmdbType}/${item.tmdbId}` : ""),
      meta: item.meta
    })),
    [i18n.language, items]
  );
  const shuffledItems = useMemo(() => shuffleAnimeItems(mediaItems), [mediaItems]);

  return (
    <section className="section media-section">
      <h2 className="section-title">{t("sections.watchedAnime")}</h2>

      <div className="section-content media-section-content">
        {isLoading && <p className="media-state-text">{t("anime.loading")}</p>}
        {!isLoading && items.length === 0 && <p className="media-state-text">{t("anime.empty")}</p>}
        {!isLoading && shuffledItems.length > 0 && <CoverMarqueeCarousel items={shuffledItems} />}
      </div>

      <div className="media-section-actions">
        <button
          type="button"
          className="cover-view-all-btn"
          onClick={() => setIsDialogOpen(true)}
          disabled={items.length === 0}
        >
          {t("anime.viewAll")}
        </button>
      </div>

      <CoverListDialog
        items={mediaItems}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={t("sections.watchedAnime")}
        labels={{
          close: t("anime.close"),
          previous: t("anime.previous"),
          next: t("anime.next"),
          page: t("anime.page")
        }}
      />
    </section>
  );
}

export default WatchedAnimeSection;
