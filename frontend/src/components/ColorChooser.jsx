import React, { useEffect, useRef, useState } from "react";
import Button from "./Button.jsx";
import ColorPicker from "./ColorPicker.jsx";
import { COLOR_THEMES, findTheme } from "../features/graph-maker/data/palettes.js";

/**
 * Popover to choose a colour: the swatches of the current theme, a "Change theme" list
 * and a free colour picker. Every change is applied immediately, so clicking outside
 * simply closes the popover and keeps the colour that was chosen.
 *
 * view: "palette" | "themes" | "picker"
 */
export default function ColorChooser({ color, onChange, themeKey, onThemeChange, onClose, className = "" }) {
  const [view, setView] = useState("palette");
  const rootRef = useRef(null);
  const theme = findTheme(themeKey);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) onClose();
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div ref={rootRef} className={`color-chooser ${className}`}>
      {view === "palette" && (
        <>
          <div className="color-chooser__title">{theme.label} colours</div>
          <div className="color-chooser__swatches">
            {theme.colors.map((swatchColor) => (
              <button
                key={swatchColor} type="button" aria-label={swatchColor}
                className={`color-chooser__swatch ${swatchColor.toLowerCase() === color.toLowerCase() ? "color-chooser__swatch--selected" : ""}`}
                style={{ backgroundColor: swatchColor }}
                onClick={() => { onChange(swatchColor); onClose(); }}
              />
            ))}
          </div>
          <div className="color-chooser__actions">
            <Button size="small" onClick={() => setView("themes")}>Change theme</Button>
            <Button size="small" onClick={() => setView("picker")}>Color picker</Button>
          </div>
        </>
      )}

      {view === "themes" && (
        <>
          <div className="color-chooser__title">Choose a theme</div>
          <div className="color-chooser__themes">
            {COLOR_THEMES.map((option) => (
              <button
                key={option.key} type="button"
                className={`color-chooser__theme ${option.key === themeKey ? "color-chooser__theme--selected" : ""}`}
                onClick={() => { onThemeChange(option.key); setView("palette"); }}
              >
                <span className="color-chooser__theme-name">{option.label}</span>
                <span className="color-chooser__theme-strip">
                  {option.colors.map((stripColor) => (
                    <span key={stripColor} className="color-chooser__theme-chip" style={{ backgroundColor: stripColor }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {view === "picker" && (
        <>
          <ColorPicker color={color} onChange={onChange} />
          <div className="color-chooser__actions">
            <Button size="small" onClick={() => setView("palette")}>Back to palette</Button>
          </div>
        </>
      )}
    </div>
  );
}
