import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import { ChartView, addText, frameLegend, useChartTools } from "./ChartTools.jsx";
import { jaccard } from "./chartUtils.js";

const CHART_WIDTH = 980;
const CHART_HEIGHT = 640;
const MARGIN = { top: 56, right: 215, bottom: 130, left: 150 };
const DEFAULT_TITLE = "Gene graph (click to rename)";
const LEGEND_BAR = { width: 18, height: 200 };
const MIN_CELL_SIZE_FOR_VALUE = 34;

// The first entry is the default colour scale.
const COLOR_SCALES = [
  { key: "RdYlBu", label: "Red - Yellow - Blue", interpolator: d3.interpolateRdYlBu },
  { key: "Spectral", label: "Spectral", interpolator: d3.interpolateSpectral },
  { key: "Oranges", label: "Oranges", interpolator: d3.interpolateOranges },
  { key: "PuBu", label: "Purple - Blue", interpolator: d3.interpolatePuBu },
];

const gradientCss = (interpolator) =>
  `linear-gradient(to right, ${d3.quantize(interpolator, 8).join(", ")})`;

/** categories[0].groups: [{id, name, genes: [{id}]}]. Every cell is the Jaccard index of two groups' gene IDs. */
export default function Heatmap({ categories }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTooltip, hideTooltip, stable } = tools;
  const groups = categories[0]?.groups ?? [];
  const [colorScaleKey, setColorScaleKey] = useState(COLOR_SCALES[0].key);
  const [scaleMenuOpen, setScaleMenuOpen] = useState(false);

  useEffect(() => {
    const labelOf = (key, fallback) => labels[key] ?? fallback;
    const groupName = (group) => labelOf(`group:${group.id}`, group.name);
    const interpolator = COLOR_SCALES.find((scale) => scale.key === colorScaleKey).interpolator;
    const colorScale = d3.scaleSequential(interpolator).domain([0, 1]);
    const gridSize = Math.min(CHART_WIDTH - MARGIN.left - MARGIN.right, CHART_HEIGHT - MARGIN.top - MARGIN.bottom);
    const cellScale = d3.scaleBand().domain(groups.map((group) => group.id)).range([0, gridSize]).padding(0.04);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    zoomApi.current = null;

    addText(svg, stable, { x: MARGIN.left + gridSize / 2, y: 30, text: labelOf("title", DEFAULT_TITLE), key: "title", className: "chart-title" });
    addText(svg, stable, { x: MARGIN.left + gridSize / 2, y: MARGIN.top + gridSize + 110, text: labelOf("xlabel", "Groups"), key: "xlabel", className: "chart-axis-title" });
    addText(svg, stable, { x: 18, y: MARGIN.top + gridSize / 2, text: labelOf("ylabel", "Groups"), key: "ylabel", className: "chart-axis-title", rotate: -90 });

    const grid = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    groups.forEach((rowGroup) => {
      groups.forEach((columnGroup) => {
        const overlap = jaccard(rowGroup.genes.map((gene) => gene.id), columnGroup.genes.map((gene) => gene.id));
        const cellX = cellScale(columnGroup.id);
        const cellY = cellScale(rowGroup.id);
        const cellColor = colorScale(overlap.value);
        grid.append("rect")
          .attr("class", "heatmap__cell")
          .attr("x", cellX).attr("y", cellY)
          .attr("width", cellScale.bandwidth()).attr("height", cellScale.bandwidth())
          .attr("fill", cellColor)
          .on("mousemove", (event) => showTooltip(event, [
            `${groupName(rowGroup)} vs ${groupName(columnGroup)}`,
            `Jaccard index: ${overlap.value.toFixed(4)}`,
            `Common genes: ${overlap.inter} of ${overlap.union} in the union`,
          ]))
          .on("mouseleave", hideTooltip);
        if (cellScale.bandwidth() > MIN_CELL_SIZE_FOR_VALUE) {
          const isDarkCell = d3.hcl(cellColor).l < 55;
          grid.append("text")
            .attr("class", `heatmap__cell-value ${isDarkCell ? "heatmap__cell-value--light" : "heatmap__cell-value--dark"}`)
            .attr("x", cellX + cellScale.bandwidth() / 2)
            .attr("y", cellY + cellScale.bandwidth() / 2 + 4)
            .text(overlap.value.toFixed(2));
        }
      });
    });
    groups.forEach((group) => {
      const centerOffset = cellScale(group.id) + cellScale.bandwidth() / 2;
      addText(grid, stable, { x: -8, y: centerOffset + 4, text: groupName(group), key: `group:${group.id}`, className: "chart-tick-label chart-text--end" });
      addText(grid, stable, { x: centerOffset, y: gridSize + 14, text: groupName(group), key: `group:${group.id}`, className: "chart-tick-label", rotate: 40 });
    });

    // colour legend; clicking the bar opens the colour-scale menu
    const legend = svg.append("g").attr("transform", `translate(${CHART_WIDTH - MARGIN.right + 44},${MARGIN.top})`);
    addText(legend, stable, { x: 0, y: -14, text: labelOf("legend", "Jaccard index"), key: "legend", className: "chart-legend-heading" });
    const gradient = svg.append("defs").append("linearGradient")
      .attr("id", "heatmap-legend-gradient").attr("x1", 0).attr("x2", 0).attr("y1", 1).attr("y2", 0);
    d3.range(0, 1.01, 0.1).forEach((t) => gradient.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", colorScale(t)));
    legend.append("rect")
      .attr("class", "heatmap__legend-bar")
      .attr("width", LEGEND_BAR.width).attr("height", LEGEND_BAR.height)
      .attr("fill", "url(#heatmap-legend-gradient)")
      .on("click", () => setScaleMenuOpen((open) => !open))
      .append("title").text("Click to change the colour scale");
    const legendTicks = d3.scaleLinear().domain([0, 1]).range([LEGEND_BAR.height, 0]);
    [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      legend.append("text").attr("class", "chart-tick-label").attr("x", LEGEND_BAR.width + 8).attr("y", legendTicks(tick) + 4).text(d3.format(".2f")(tick));
    });
    legend.append("text").attr("class", "chart-hint-label").attr("x", 0).attr("y", LEGEND_BAR.height + 24).text("Click the bar to");
    legend.append("text").attr("class", "chart-hint-label").attr("x", 0).attr("y", LEGEND_BAR.height + 38).text("change colours");
    frameLegend(legend, 12);
  }, [groups, labels, colorScaleKey, svgRef, zoomApi, showTooltip, hideTooltip, stable]);

  const scaleMenu = scaleMenuOpen && (
    <div className="heatmap__scale-menu">
      <div className="heatmap__scale-menu-title">Colour scale</div>
      {COLOR_SCALES.map((scale) => (
        <button
          key={scale.key} type="button"
          className={`heatmap__scale-option ${scale.key === colorScaleKey ? "heatmap__scale-option--active" : ""}`}
          onClick={() => { setColorScaleKey(scale.key); setScaleMenuOpen(false); }}
        >
          <span className="heatmap__scale-preview" style={{ backgroundImage: gradientCss(scale.interpolator) }} />
          {scale.label}
        </button>
      ))}
    </div>
  );

  return <ChartView tools={tools} width={CHART_WIDTH} height={CHART_HEIGHT} overlay={scaleMenu} zoomable={false} />;
}
