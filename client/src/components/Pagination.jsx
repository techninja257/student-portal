export default function Pagination({ currentPage, totalPages, total, limit, onPageChange }) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  // Build page number list with ellipsis
  function pageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    const delta = 1; // pages around current
    const left = currentPage - delta;
    const right = currentPage + delta;

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) {
      pages.push(i);
    }
    if (right < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition';
  const btnActive = `${btnBase} bg-[#006565] text-white`;
  const btnDefault = `${btnBase} bg-white text-on-surface-variant border border-outline-variant/30 hover:bg-surface-low`;
  const btnDisabled = `${btnBase} bg-white text-outline/40 border border-outline-variant/20 cursor-not-allowed`;

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-outline hidden sm:block">
        Showing <span className="font-semibold text-on-surface-variant">{from}</span>–<span className="font-semibold text-on-surface-variant">{to}</span> of <span className="font-semibold text-on-surface-variant">{total}</span> results
      </p>

      <div className="inline-flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={currentPage === 1 ? btnDisabled : btnDefault}
        >
          Previous
        </button>

        <span className="sm:hidden text-xs text-on-surface-variant px-2">Page {currentPage} of {totalPages}</span>

        {pageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="hidden sm:inline-flex px-2 py-1.5 text-sm text-outline select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`hidden sm:inline-flex ${p === currentPage ? btnActive : btnDefault}`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={currentPage === totalPages ? btnDisabled : btnDefault}
        >
          Next
        </button>
      </div>
    </div>
  );
}
