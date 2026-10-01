import React, { useState } from "react";
import Button from "../../../components/Button.jsx";
import { downloadPng, downloadSvg } from "../data/exportChart.js";

const ZOOM_HINT = "Ctrl + scroll (or the + / - buttons) to zoom, drag to pan. ";

/**
 * The frame around every chart: the SVG, tooltip, rename box, zoom buttons and the Export menu.
 *   toolbar  - extra controls above the chart
 *   overlay  - extra content on top of the chart (e.g. a menu)
 *   hint     - help text under the chart (defaults to the zoom hint)
 */
export default function ChartView({ tools, width, height, toolbar, overlay, zoomable = true, hint }) {
  const { containerRef, svgRef, tooltip, renameBox, setRenameBox, setLabels, zoomApi } = tools;
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

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

  const helpText = hint ?? `${zoomable ? ZOOM_HINT : ""}Click any text to rename it.`;

  return (
    <div className="chart-view">
      {toolbar}
      <div ref={containerRef} className="chart-view__canvas">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="chart-view__svg" />
        {overlay}
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
