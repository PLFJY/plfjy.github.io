import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadGamesItems, shuffleGamesItems } from "../api/gamesManifest";
import CoverListDialog from "./media/CoverListDialog";
import CoverMarqueeCarousel from "./media/CoverMarqueeCarousel";

function GamesSection() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadGamesItems()
      .then((loadedItems) => isMounted && setItems(loadedItems))
      .catch((error) => {
        console.warn("Games data could not be loaded.", error);
        if (isMounted) setItems([]);
      })
      .finally(() => isMounted && setIsLoading(false));
    return () => { isMounted = false; };
  }, []);

  const mediaItems = useMemo(
    () => items.map((item) => ({
      key: item.key,
      title: item.title.name || item.note || "Untitled",
      subtitle: item.title.localized || item.note || "",
      cover: item.cover,
      url: item.url,
      meta: item.meta
    })),
    [items]
  );
  const shuffledItems = useMemo(() => shuffleGamesItems(mediaItems), [mediaItems]);

  return (
    <section className="section media-section">
      <h2 className="section-title">{t("sections.games")}</h2>
      <div className="section-content media-section-content">
        {isLoading && <p className="media-state-text">{t("games.loading")}</p>}
        {!isLoading && items.length === 0 && <p className="media-state-text">{t("games.empty")}</p>}
        {!isLoading && shuffledItems.length > 0 && <CoverMarqueeCarousel items={shuffledItems} />}
      </div>
      <div className="media-section-actions">
        <button type="button" className="cover-view-all-btn" onClick={() => setIsDialogOpen(true)} disabled={items.length === 0}>
          {t("games.viewAll")}
        </button>
      </div>
      <CoverListDialog
        items={mediaItems}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={t("sections.games")}
        labels={{ close: t("games.close"), previous: t("games.previous"), next: t("games.next"), page: t("games.page") }}
      />
    </section>
  );
}

export default GamesSection;
