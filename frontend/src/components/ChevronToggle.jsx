import React from "react";

/** The expand / collapse arrow of every card: points down when collapsed, up when expanded. */
export default function ChevronToggle({ expanded, onClick, label = "Toggle Expand" }) {
  return (
    <button type="button" className="chevron-toggle" onClick={onClick} aria-label={label} aria-expanded={expanded}>
      <svg viewBox="0 0 22 18" className={`chevron-toggle__icon ${expanded ? "chevron-toggle__icon--expanded" : ""}`}>
        <path d="M2 2 L11 15 L20 2" />
      </svg>
    </button>
  );
}
