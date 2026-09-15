import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  ArrowRight,
  Users,
  Tractor as TractorIcon,
  Truck,
  Command as CommandIcon,
} from "lucide-react";

import { useAppData } from "../../context/AppDataContext";
import { searchEverything } from "../../utils/globalSearch";

import "./CommandPalette.css";

/* =========================================================
   COMMAND PALETTE
   Global keyboard-driven search (Ctrl/Cmd + K)
   ========================================================= */

export default function CommandPalette({ open, onClose, onNavigate }) {
  const { parties = [], tractors = [], trips = [] } = useAppData();

  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  /* ----- Reset on open ----- */
  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlightedIndex(0);
      // focus after mount
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* ----- Esc to close ----- */
  useEffect(() => {
    if (!open) return;

    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* ----- Body scroll lock ----- */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  /* ----- Search results ----- */
  const results = useMemo(
    () =>
      searchEverything({
        query,
        parties,
        tractors,
        trips,
      }),
    [query, parties, tractors, trips]
  );

  /* ----- Flat list for keyboard nav ----- */
  const flatItems = useMemo(() => {
    return [
      ...results.navigation,
      ...results.parties,
      ...results.tractors,
      ...results.trips,
    ];
  }, [results]);

  /* ----- Reset highlight when results change ----- */
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  /* ----- Keep highlighted item in view ----- */
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const node = list.querySelector(`[data-cmd-index="${highlightedIndex}"]`);
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open]);

  /* ----- Keyboard navigation ----- */
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) =>
        flatItems.length === 0 ? 0 : (i + 1) % flatItems.length
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) =>
        flatItems.length === 0
          ? 0
          : (i - 1 + flatItems.length) % flatItems.length
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[highlightedIndex];
      if (item) {
        handleSelect(item);
      }
    }
  };

  const handleSelect = (item) => {
    if (!item) return;
    if (typeof onNavigate === "function") {
      onNavigate(item.page);
    }
    onClose();
  };

  if (!open) return null;

  const hasResults = results.total > 0;

  return (
    <div
      className="cmd-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      <button
        type="button"
        className="cmd-palette__backdrop"
        onClick={onClose}
        aria-label="Close search"
      />

      <div
        className="cmd-palette__panel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ----- Input row ----- */}
        <div className="cmd-palette__input-row">
          <span className="cmd-palette__input-icon" aria-hidden="true">
            <Search size={18} strokeWidth={2} />
          </span>

          <input
            ref={inputRef}
            type="text"
            className="cmd-palette__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search trips, parties, tractors, or jump to a page..."
            aria-label="Global search input"
            autoComplete="off"
            spellCheck="false"
          />

          <kbd className="cmd-palette__kbd">Esc</kbd>

          <button
            type="button"
            className="cmd-palette__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ----- Results ----- */}
        <div className="cmd-palette__results" ref={listRef}>
          {!hasResults && (
            <div className="cmd-palette__empty">
              <Search size={20} strokeWidth={1.8} aria-hidden="true" />
              <strong>No results</strong>
              <span>
                {query
                  ? `"${query}" ke liye kuch nahi mila.`
                  : "Type to search..."}
              </span>
            </div>
          )}

          {results.navigation.length > 0 && (
            <Group
              title="Quick Navigation"
              icon={<CommandIcon size={13} strokeWidth={2} />}
            >
              {results.navigation.map((item) => {
                const flatIndex = flatItems.indexOf(item);
                return (
                  <ResultItem
                    key={item.id}
                    index={flatIndex}
                    highlighted={flatIndex === highlightedIndex}
                    icon={<ArrowRight size={15} strokeWidth={2} />}
                    label={item.label}
                    hint={item.hint}
                    onSelect={() => handleSelect(item)}
                    onHover={() => setHighlightedIndex(flatIndex)}
                  />
                );
              })}
            </Group>
          )}

          {results.parties.length > 0 && (
            <Group title="Parties" icon={<Users size={13} strokeWidth={2} />}>
              {results.parties.map((item) => {
                const flatIndex = flatItems.indexOf(item);
                return (
                  <ResultItem
                    key={item.id}
                    index={flatIndex}
                    highlighted={flatIndex === highlightedIndex}
                    icon={<Users size={15} strokeWidth={2} />}
                    label={item.label}
                    hint={item.hint}
                    onSelect={() => handleSelect(item)}
                    onHover={() => setHighlightedIndex(flatIndex)}
                  />
                );
              })}
            </Group>
          )}

          {results.tractors.length > 0 && (
            <Group
              title="Tractors"
              icon={<TractorIcon size={13} strokeWidth={2} />}
            >
              {results.tractors.map((item) => {
                const flatIndex = flatItems.indexOf(item);
                return (
                  <ResultItem
                    key={item.id}
                    index={flatIndex}
                    highlighted={flatIndex === highlightedIndex}
                    icon={<TractorIcon size={15} strokeWidth={2} />}
                    label={item.label}
                    hint={item.hint}
                    onSelect={() => handleSelect(item)}
                    onHover={() => setHighlightedIndex(flatIndex)}
                  />
                );
              })}
            </Group>
          )}

          {results.trips.length > 0 && (
            <Group title="Trips" icon={<Truck size={13} strokeWidth={2} />}>
              {results.trips.map((item) => {
                const flatIndex = flatItems.indexOf(item);
                return (
                  <ResultItem
                    key={item.id}
                    index={flatIndex}
                    highlighted={flatIndex === highlightedIndex}
                    icon={<Truck size={15} strokeWidth={2} />}
                    label={item.label}
                    hint={item.hint}
                    onSelect={() => handleSelect(item)}
                    onHover={() => setHighlightedIndex(flatIndex)}
                  />
                );
              })}
            </Group>
          )}
        </div>

        {/* ----- Footer ----- */}
        <div className="cmd-palette__footer">
          <span className="cmd-palette__foot-hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            Navigate
          </span>
          <span className="cmd-palette__foot-hint">
            <kbd>↵</kbd>
            Open
          </span>
          <span className="cmd-palette__foot-hint">
            <kbd>Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

function Group({ title, icon, children }) {
  return (
    <div className="cmd-palette__group">
      <div className="cmd-palette__group-head">
        <span className="cmd-palette__group-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="cmd-palette__group-title">{title}</span>
      </div>
      <div className="cmd-palette__group-items">{children}</div>
    </div>
  );
}

function ResultItem({
  index,
  highlighted,
  icon,
  label,
  hint,
  onSelect,
  onHover,
}) {
  return (
    <button
      type="button"
      data-cmd-index={index}
      className={`cmd-palette__item ${highlighted ? "is-active" : ""}`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <span className="cmd-palette__item-icon" aria-hidden="true">
        {icon}
      </span>

      <span className="cmd-palette__item-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>

      <ArrowRight
        className="cmd-palette__item-arrow"
        size={14}
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  );
}