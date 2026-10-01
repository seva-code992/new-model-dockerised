import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// A custom colour picker: saturation/brightness square, hue slider, hex field with preview, format menu, copy button.

const FORMATS = {
  HEX: (hex) => hex.toLowerCase(),
  RGB: (hex) => d3.rgb(hex).formatRgb(),
  HSL: (hex) => d3.hsl(hex).formatHsl(),
};

function hexToHsv(hex) {
  const { r, g, b } = d3.rgb(hex);
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max ? delta / max : 0, v: max };
}

function hsvToHex({ h, s, v }) {
  const channel = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return d3.rgb(channel(5) * 255, channel(3) * 255, channel(1) * 255).formatHex();
}

/** Calls onMove(x, y) with 0..1 positions inside the element while the pointer is pressed. */
function useDragInside(onMove) {
  const handlePointer = (event) => {
    if (event.type === "pointermove" && event.buttons !== 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (value) => Math.max(0, Math.min(1, value));
    onMove(clamp((event.clientX - rect.left) / rect.width), clamp((event.clientY - rect.top) / rect.height));
  };
  return {
    onPointerDown: (event) => { event.currentTarget.setPointerCapture(event.pointerId); handlePointer(event); },
    onPointerMove: handlePointer,
  };
}

export default function ColorPicker({ color, onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [format, setFormat] = useState("HEX");
  const [draftText, setDraftText] = useState(null); // text being typed, null while not editing
  const [copied, setCopied] = useState(false);
  const lastSentColor = useRef(color);

  // Follow colour changes that come from outside (e.g. a palette swatch).
  useEffect(() => {
    if (color !== lastSentColor.current) {
      lastSentColor.current = color;
      setHsv(hexToHsv(color));
    }
  }, [color]);

  const update = (nextHsv) => {
    setHsv(nextHsv);
    const hex = hsvToHex(nextHsv);
    lastSentColor.current = hex;
    onChange(hex);
  };

  const squareHandlers = useDragInside((x, y) => update({ ...hsv, s: x, v: 1 - y }));
  const hueHandlers = useDragInside((x) => update({ ...hsv, h: x * 359.999 }));

  const currentHex = hsvToHex(hsv);
  const shownText = draftText ?? FORMATS[format](currentHex);

  const commitText = (text) => {
    const parsed = d3.color(text.trim());
    if (parsed) update(hexToHsv(parsed.formatHex()));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FORMATS[format](currentHex));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="color-picker">
      <div className="color-picker__square" style={{ backgroundColor: d3.hsl(hsv.h, 1, 0.5).formatHex() }} {...squareHandlers}>
        <div className="color-picker__square-white" />
        <div className="color-picker__square-black" />
        <div className="color-picker__thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
      </div>

      <div className="color-picker__hue" {...hueHandlers}>
        <div className="color-picker__hue-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: d3.hsl(hsv.h, 1, 0.5).formatHex() }} />
      </div>

      <div className="color-picker__value-row">
        <input
          className="color-picker__text" value={shownText} aria-label="Colour value"
          onFocus={() => setDraftText(FORMATS[format](currentHex))}
          onChange={(event) => { setDraftText(event.target.value); commitText(event.target.value); }}
          onBlur={() => setDraftText(null)}
        />
        <span className="color-picker__preview" style={{ backgroundColor: currentHex }} />
      </div>

      <div className="color-picker__format-row">
        <select className="color-picker__format" value={format} onChange={(event) => setFormat(event.target.value)} aria-label="Colour format">
          {Object.keys(FORMATS).map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <button type="button" className="color-picker__copy" onClick={copy} title="Copy colour" aria-label="Copy colour">
          {copied ? "✓" : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="color-picker__copy-icon">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
