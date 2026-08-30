import { useEffect, useMemo, useState } from "react";
import CoverCard from "./CoverCard";

const DESKTOP_PAGE_SIZE = 12;
const MOBILE_PAGE_SIZE = 4;

function CoverListDialog({ items, isOpen, onClose, title, labels }) {
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
      setPageSize(window.matchMedia("(max-width: 768px)").matches ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE);
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
    <div className="cover-list-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="cover-list-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-list-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="cover-list-dialog-header">
          <h2 id="cover-list-dialog-title">{title}</h2>
          <button type="button" className="cover-icon-button" onClick={onClose} aria-label={labels.close}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="cover-list-dialog-grid">
          {visibleItems.map((item) => <CoverCard key={item.key} item={item} />)}
        </div>
        <div className="cover-pagination">
          <button type="button" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}>{labels.previous}</button>
          <span>{labels.page} {page} / {pageCount}</span>
          <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= pageCount}>{labels.next}</button>
        </div>
      </div>
    </div>
  );
}

export default CoverListDialog;
