import React from "react";

/** Round magnifier button that submits a search form (same in Semantic and Keyword search). */
export default function SearchSubmitButton({ disabled }) {
  return (
    <button type="submit" disabled={disabled} className="icon-button icon-button--round icon-button--primary" aria-label="Search">
      <svg className="icon-button__icon" viewBox="0 0 24 24">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
  );
}
