import React from "react";
import ChevronToggle from "./ChevronToggle.jsx";

/**
 * The frame shared by all features: title, short description while collapsed,
 * the chevron on the right, and the content once expanded.
 *
 * headerActions: optional extra controls shown left of the chevron while expanded.
 */
export default function CollapsibleCard({ title, description, expanded, onToggle, headerActions, className = "", children }) {
  return (
    <section className={`card ${className}`}>
      <header className="card__header">
        <div>
          <h2 className="card__title">{title}</h2>
          {!expanded && description && <p className="card__description">{description}</p>}
        </div>
        <div className="card__header-actions">
          {expanded && headerActions}
          <ChevronToggle expanded={expanded} onClick={onToggle} />
        </div>
      </header>
      {expanded && <div className="card__body">{children}</div>}
    </section>
  );
}
