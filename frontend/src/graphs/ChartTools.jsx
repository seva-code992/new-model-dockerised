import React, { useCallback, useMemo, useRef, useState } from "react";
import { downloadPng, downloadSvg } from "./chartUtils.js";

/**
 * State shared by every chart: rename box, hover tooltip and label overrides.
 * `stable` only holds functions whose identity never changes, so d3 effects can depend on it.
 */
export function useChartTools() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const zoomApi = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [renameBox, setRenameBox] = useState(null);
  const [labels, setLabels] = useState({});

  const showTooltip = useCallback((event, lines) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    setTooltip({ x: event.clientX - containerRect.left + 14, y: event.clientY - containerRect.top + 14, lines });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  const startRename = useCallback((key, element, value) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const textRect = element.getBoundingClientRect();
    setTooltip(null);
    setRenameBox({
      key,
      value,
      x: textRect.left - containerRect.left,
      y: textRect.top - containerRect.top,
      width: Math.max(textRect.width + 24, 140),
      height: Math.max(textRect.height, 24),
    });
  }, []);

  const stable = useMemo(() => ({ startRename }), [startRename]);

  return {
    stable, containerRef, svgRef, zoomApi,
    tooltip, renameBox, setRenameBox, labels, setLabels,
    showTooltip, hideTooltip, startRename,
  };
}

/** Append an SVG text element that opens the rename box when clicked. Styling comes from CSS classes. */
export function addText(parent, tools, { x, y, text, key, className = "", rotate }) {
  const textElement = parent
    .append("text")
    .attr("class", `chart-text chart-text--renamable ${className}`)
    .attr("x", x)
    .attr("y", y)
    .text(text)
    .on("click", (event) => tools.startRename(key, event.currentTarget, text));
  if (rotate) textElement.attr("transform", `rotate(${rotate} ${x} ${y})`);
  textElement.append("title").text("Click to rename");
  return textElement;
}

/** Draw a framed box behind an already-filled legend group. */
export function frameLegend(legendGroup, padding = 10) {
  const box = legendGroup.node().getBBox();
  legendGroup
    .insert("rect", ":first-child")
    .attr("class", "chart-legend-frame")
    .attr("x", box.x - padding)
    .attr("y", box.y - padding)
    .attr("width", box.width + padding * 2)
    .attr("height", box.height + padding * 2);
}

export function ChartView({ tools, width, height, toolbar, overlay }) {
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
            value={renameBox.value}
            onChange={(event) => setRenameBox({ ...renameBox, value: event.target.value })}
            onBlur={commitRename}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") setRenameBox(null);
            }}
            className="chart-rename-input"
            style={{ left: renameBox.x, top: renameBox.y, width: renameBox.width, height: renameBox.height }}
          />
        )}
      </div>
      <div className="chart-view__actions">
        <span className="chart-view__hint">Scroll to zoom, drag to pan, click any text to rename it.</span>
        <div className="chart-view__buttons">
          <button type="button" className="gm-button gm-button--small" onClick={() => zoomApi.current?.reset?.()}>
            Reset zoom
          </button>
          <div className="export-menu">
            <button type="button" className="gm-button gm-button--small" onClick={() => setExportMenuOpen((open) => !open)}>
              Export as...
            </button>
            {exportMenuOpen && (
              <div className="export-menu__list">
                <button type="button" className="export-menu__item" onClick={() => exportAs("svg")}>SVG (vector)</button>
                <button type="button" className="export-menu__item" onClick={() => exportAs("png")}>PNG (image)</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
