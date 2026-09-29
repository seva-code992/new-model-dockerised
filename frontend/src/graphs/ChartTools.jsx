import React, { useCallback, useMemo, useRef, useState } from "react";
import { downloadPng, downloadSvg } from "./chartUtils.js";

export const FONT = "Archivo, Arial, sans-serif";

/** State shared by every chart: rename overlay, tooltip and label overrides. */
export function useChartTools() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const zoomApi = useRef(null);
  const [tip, setTip] = useState(null);
  const [edit, setEdit] = useState(null);
  const [labels, setLabels] = useState({});

  const showTip = useCallback((event, lines) => {
    const r = containerRef.current.getBoundingClientRect();
    setTip({ x: event.clientX - r.left + 14, y: event.clientY - r.top + 14, lines });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  const startEdit = useCallback((key, el, value) => {
    const r = containerRef.current.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setTip(null);
    setEdit({ key, value, x: b.left - r.left, y: b.top - r.top, w: Math.max(b.width + 24, 140), h: b.height });
  }, []);

  const stable = useMemo(() => ({ startEdit }), [startEdit]); // identity never changes, safe for effect deps

  return { stable, containerRef, svgRef, zoomApi, tip, edit, setEdit, labels, setLabels, showTip, hideTip, startEdit };
}

/** Append an SVG text that opens the rename box when clicked. */
export function addText(parent, tools, { x, y, text, key, anchor = "start", size = 12, weight = "normal", fill = "#111", rotate }) {
  const t = parent
    .append("text")
    .attr("x", x)
    .attr("y", y)
    .attr("text-anchor", anchor)
    .attr("font-family", FONT)
    .attr("font-size", size)
    .attr("font-weight", weight)
    .attr("fill", fill)
    .style("cursor", "text")
    .text(text)
    .on("click", (event) => tools.startEdit(key, event.currentTarget, text));
  if (rotate) t.attr("transform", `rotate(${rotate} ${x} ${y})`);
  t.append("title").text("Click to rename");
  return t;
}

export function ChartView({ tools, width, height, children }) {
  const { containerRef, svgRef, tip, edit, setEdit, setLabels, zoomApi } = tools;

  const commit = () => {
    if (edit && edit.value.trim()) {
      setLabels((l) => ({ ...l, [edit.key]: edit.value.trim() }));
    }
    setEdit(null);
  };

  const btn = "bg-[#D9D9D9] hover:bg-gray-300 border border-gray-400 text-black px-3 py-1 text-xs shadow-sm";

  return (
    <div className="flex flex-col gap-2">
      {children}
      <div ref={containerRef} className="relative bg-white border border-gray-300 overflow-hidden">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" />
        {tip && (
          <div
            className="pointer-events-none absolute z-20 bg-black/85 text-white text-xs p-2 rounded max-w-xs"
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.lines.map((l, i) => (
              <div key={i} className={i === 0 ? "font-bold" : ""}>{l}</div>
            ))}
          </div>
        )}
        {edit && (
          <input
            autoFocus
            value={edit.value}
            onChange={(e) => setEdit({ ...edit, value: e.target.value })}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEdit(null);
            }}
            onFocus={(e) => e.target.select()}
            className="absolute z-30 border border-black bg-white text-black text-sm px-1"
            style={{ left: edit.x, top: edit.y, width: edit.w, height: Math.max(edit.h, 24) }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" className={btn} onClick={() => zoomApi.current?.reset?.()}>Reset zoom</button>
        <button type="button" className={btn} onClick={() => downloadSvg(svgRef.current)}>Download SVG</button>
        <button type="button" className={btn} onClick={() => downloadPng(svgRef.current)}>Download PNG</button>
        <span className="text-xs text-gray-500">Scroll to zoom, drag to pan, click any text to rename it.</span>
      </div>
    </div>
  );
}
