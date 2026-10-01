import React, { useEffect, useState } from "react";
import Button from "../../../components/Button.jsx";
import { downloadPng, downloadSvg } from "../data/exportChart.js";

const ZOOM_HINT = "Ctrl + scroll (or the + / - buttons) to zoom, drag to pan. ";

/** Details of a clicked bar / square, kept open until closed (x button, Esc, or a click on empty chart space). */
function PinnedPanel({ pinned, containerRef, onClose }) {
  const { heading, rows = [], lists = [] } = pinned.content;
  const container = containerRef.current;
  const PANEL_WIDTH = 320;
  const PANEL_MAX_HEIGHT = 340;
  const left = Math.max(8, Math.min(pinned.x + 14, (container?.clientWidth ?? 800) - PANEL_WIDTH - 8));
  const top = Math.max(8, Math.min(pinned.y + 14, (container?.clientHeight ?? 600) - PANEL_MAX_HEIGHT - 8));

  return (
    <div className="chart-pinned" style={{ left, top }} role="dialog" aria-label={heading}>
      <div className="chart-pinned__header">
        <span className="chart-pinned__heading">{heading}</span>
        <button type="button" className="chart-pinned__close" onClick={onClose} aria-label="Close details">×</button>
      </div>
      <div className="chart-pinned__body">
        {rows.map(([label, text]) => (
          <div key={label} className="chart-pinned__row">
            <span className="chart-pinned__label">{label}</span>
            <span className="chart-pinned__value">{text}</span>
          </div>
        ))}
        {lists.map((list) => (
          <div key={list.title} className="chart-pinned__list">
            <div className="chart-pinned__label">{list.title}</div>
            {list.items.length ? (
              <ul className="chart-pinned__items">
                {list.items.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            ) : <div className="chart-pinned__value">none</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The frame around every chart: the SVG, tooltip, rename box, zoom buttons and the Export menu.
 *   toolbar  - extra controls above the chart
 *   overlay  - extra content on top of the chart (e.g. a menu)
 *   hint     - help text under the chart (defaults to the zoom hint)
 */
export default function ChartView({ tools, width, height, toolbar, overlay, zoomable = true, hint, pinHint = "" }) {
  const { containerRef, svgRef, tooltip, pinned, unpinPanel, renameBox, setRenameBox, setLabels, zoomApi } = tools;
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    if (!pinned) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") unpinPanel(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [pinned, unpinPanel]);

  const commitRename = () => {
    if (renameBox && renameBox.value.trim()) {
      setLabels((labels) => ({ ...labels, [renameBox.key]: renameBox.value.trim() }));
    }
    setRenameBox(null);
  };

  const exportAs = (format) => {
    setExportMenuOpen(false);
    if (format === "svg") downloadSvg(svgRef.current);
    else downloadPng(svgRef.current);
  };

  const helpText = hint ?? `${zoomable ? ZOOM_HINT : ""}${pinHint ? `${pinHint} ` : ""}Click any text to rename it.`;

  return (
    <div className="chart-view">
      {toolbar}
      <div ref={containerRef} className="chart-view__canvas">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="chart-view__svg" />
        {overlay}
        {pinned && <PinnedPanel pinned={pinned} containerRef={containerRef} onClose={unpinPanel} />}
        {tooltip && (
          <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.lines.map((line, index) => (
              <div key={index} className={index === 0 ? "chart-tooltip__heading" : ""}>{line}</div>
            ))}
          </div>
        )}
        {renameBox && (
          <input
            autoFocus
            className="chart-rename-input"
            value={renameBox.value}
            placeholder={renameBox.placeholder}
            onChange={(event) => setRenameBox({ ...renameBox, value: event.target.value })}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") setRenameBox(null);
            }}
            style={{ left: renameBox.x, top: renameBox.y, width: renameBox.width, height: renameBox.height }}
          />
        )}
      </div>

      <div className="chart-view__actions">
        <span className="chart-view__hint">{helpText}</span>
        <div className="chart-view__buttons">
          {zoomable && (
            <>
              <Button size="small" aria-label="Zoom in" onClick={() => zoomApi.current?.zoomIn?.()}>+</Button>
              <Button size="small" aria-label="Zoom out" onClick={() => zoomApi.current?.zoomOut?.()}>-</Button>
              <Button size="small" onClick={() => zoomApi.current?.reset?.()}>Reset zoom</Button>
            </>
          )}
          <div className="menu-anchor">
            <Button size="small" onClick={() => setExportMenuOpen((open) => !open)}>Export as...</Button>
            {exportMenuOpen && (
              <div className="menu menu--above">
                <button type="button" className="menu__item" onClick={() => exportAs("svg")}>SVG (vector)</button>
                <button type="button" className="menu__item" onClick={() => exportAs("png")}>PNG (image)</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
