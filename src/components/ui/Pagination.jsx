import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "./Pagination.css";

function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  totalItems = 0,
  pageSize = 10,
}) {
  const safeTotalPages = Math.max(
    1,
    Number(totalPages) || 1,
  );

  const safePage = Math.min(
    Math.max(1, Number(page) || 1),
    safeTotalPages,
  );

  const start =
    totalItems > 0
      ? (safePage - 1) * pageSize + 1
      : 0;

  const end =
    totalItems > 0
      ? Math.min(
          safePage * pageSize,
          totalItems,
        )
      : 0;

  if (safeTotalPages <= 1 && totalItems === 0) {
    return null;
  }

  return (
    <div className="ui-pagination">
      <span className="ui-pagination-info">
        {totalItems > 0
          ? `${start}–${end} of ${totalItems}`
          : "No records"}
      </span>

      <div className="ui-pagination-controls">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() =>
            onPageChange?.(safePage - 1)
          }
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="ui-pagination-page">
          {safePage} / {safeTotalPages}
        </span>

        <button
          type="button"
          disabled={
            safePage >= safeTotalPages
          }
          onClick={() =>
            onPageChange?.(safePage + 1)
          }
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;