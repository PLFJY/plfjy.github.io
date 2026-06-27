import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadWatchedAnimeItems, shuffleAnimeItems } from "../api/watchedAnimeManifest";
import AnimeMarqueeCarousel from "./AnimeMarqueeCarousel";
import WatchedAnimeListDialog from "./WatchedAnimeListDialog";

function WatchedAnimeSection() {
  const { t } = useTranslation();
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

  const shuffledItems = useMemo(() => shuffleAnimeItems(items), [items]);

  return (
    <section className="section watched-anime-section">
      <div className="anime-section-heading">
        <h2 className="section-title">{t("sections.watchedAnime")}</h2>
        <button
          type="button"
          className="anime-view-all-btn"
          onClick={() => setIsDialogOpen(true)}
          disabled={items.length === 0}
        >
          {t("anime.viewAll")}
        </button>
      </div>

      <div className="section-content anime-section-content">
        {isLoading && <p className="anime-state-text">{t("anime.loading")}</p>}
        {!isLoading && shuffledItems.length === 0 && <p className="anime-state-text">{t("anime.empty")}</p>}
        {!isLoading && shuffledItems.length > 0 && <AnimeMarqueeCarousel items={shuffledItems} />}
      </div>

      <WatchedAnimeListDialog
        items={items}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  );
}

export default WatchedAnimeSection;
