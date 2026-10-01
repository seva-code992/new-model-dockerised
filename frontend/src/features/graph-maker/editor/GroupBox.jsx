import React, { useState } from "react";
import ColorChooser from "../../../components/ColorChooser.jsx";
import DataSummary from "./DataSummary.jsx";
import NameInput from "./NameInput.jsx";

/**
 * One dataset: a name, and a box to paste its data into. In the bar and network editors the coloured
 * frame around the text is a button that opens the colour chooser; heatmap groups have no colour.
 */
export default function GroupBox({ plotType, group, placeholder, showColor, canRemove, themeKey, onThemeChange, onChange, onRemove }) {
  const [chooserOpen, setChooserOpen] = useState(false);

  return (
    <div className="editor-group">
      <div className="editor-group__heading">
        <NameInput
          className="editor-group__name" label="Group name"
          value={group.name} defaultName={group.defaultName}
          onChange={(name) => onChange({ ...group, name })}
        />
        <span className="editor-group__rename-hint">(Click to rename)</span>
        {canRemove && (
          <button type="button" className="editor__remove-button" title="Remove group" onClick={onRemove}>×</button>
        )}
      </div>

      {showColor && <span className="editor-group__color-hint">Click the coloured frame to change its colour</span>}

      <div className={`editor-group__box ${showColor ? "" : "editor-group__box--plain"}`} style={{ "--group-color": group.color }}>
        {showColor && (
          <button
            type="button" className="editor-group__frame-button" title="Click to change the colour"
            aria-label="Change the colour of this group"
            onMouseDown={(event) => event.stopPropagation()} // keeps an open chooser from closing and reopening
            onClick={() => setChooserOpen((open) => !open)}
          />
        )}
        <textarea
          className="editor-group__textarea" value={group.text} placeholder={placeholder} spellCheck={false}
          onChange={(event) => onChange({ ...group, text: event.target.value })}
        />
      </div>

      {chooserOpen && (
        <ColorChooser
          className="editor-group__chooser"
          color={group.color} themeKey={themeKey} onThemeChange={onThemeChange}
          onChange={(color) => onChange({ ...group, color })}
          onClose={() => setChooserOpen(false)}
        />
      )}

      <DataSummary plotType={plotType} text={group.text} />
    </div>
  );
}
