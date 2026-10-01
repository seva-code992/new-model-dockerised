import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import ChartView from "./ChartView.jsx";
import { useChartTools } from "./useChartTools.js";
import { addText, frameBox } from "./svgText.js";
import { jaccard } from "../data/statistics.js";
import { HEATMAP_MEASURES, countGenesWithoutData, findMeasure, genesByMeasureValue, hasMeasureColumn } from "../data/measures.js";

const CHART_WIDTH = 980;
const CHART_HEIGHT = 640;
const MARGIN = { top: 56, right: 215, bottom: 130, left: 150 };
const DEFAULT_TITLE = "Gene graph (click to rename)";
const LEGEND_BAR = { width: 18, height: 200 };
const MIN_CELL_SIZE_FOR_VALUE = 34;

// The first entry is the default colour scale. "Heat" means intensity: a Jaccard index of 0 is the cold end
// and 1 is the hot end. RdYlBu and Spectral run red -> blue in d3, so they are flipped to put red at 1.
const COLOR_SCALES = [
  { key: "RdYlBu", label: "Blue - Yellow - Red", interpolator: d3.interpolateRdYlBu, reversed: true },
  { key: "Spectral", label: "Spectral (red = high)", interpolator: d3.interpolateSpectral, reversed: true },
  { key: "Oranges", label: "Oranges", interpolator: d3.interpolateOranges, reversed: false },
  { key: "PuBu", label: "Purple - Blue", interpolator: d3.interpolatePuBu, reversed: false },
];

/** The colour for a Jaccard index t in [0, 1]. */
const colorAt = (scale) => (t) => scale.interpolator(scale.reversed ? 1 - t : t);

const gradientCss = (scale) =>
  `linear-gradient(to right, ${d3.quantize(colorAt(scale), 8).join(", ")})`;

/**
 * categories[0].groups: [{ id, name, genes: [{ id, columns }] }].
 * Every cell is the Jaccard index of two groups, compared on the chosen measure (gene IDs by default).
 */
export default function Heatmap({ categories, measureKey, onMeasureChange }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTooltip, hideTooltip, pinPanel, unpinPanel, stable } = tools;
  const groups = categories[0]?.groups ?? [];
  const [colorScaleKey, setColorScaleKey] = useState(COLOR_SCALES[0].key);
  const [scaleMenuOpen, setScaleMenuOpen] = useState(false);
  const measure = findMeasure(measureKey);
  const availableMeasures = HEATMAP_MEASURES.filter((option) => hasMeasureColumn(groups, option));

  useEffect(() => {
    const labelOf = (key, fallback) => labels[key] ?? fallback;
    const groupName = (group) => labelOf(`group:${group.id}`, group.name);
    const activeScale = COLOR_SCALES.find((scale) => scale.key === colorScaleKey);
    const colorScale = d3.scaleSequential(colorAt(activeScale)).domain([0, 1]);
    const gridSize = Math.min(CHART_WIDTH - MARGIN.left - MARGIN.right, CHART_HEIGHT - MARGIN.top - MARGIN.bottom);
    const cellScale = d3.scaleBand().domain(groups.map((group) => group.id)).range([0, gridSize]).padding(0.04);
    // For every group: which genes carry each value of the measure. Missing data ("-") gives no value at all.
    const genesByValue = new Map(groups.map((group) => [group.id, genesByMeasureValue(group, measure)]));
    const geneIdsMode = !measure.column;

    /** Everything the pinned panel shows about the overlap of two groups. */
    const describeOverlap = (rowGroup, columnGroup, overlap) => {
      const rowGenes = genesByValue.get(rowGroup.id);
      const columnGenes = genesByValue.get(columnGroup.id);
      const sameGroup = rowGroup.id === columnGroup.id;
      const rowName = groupName(rowGroup);
      const columnName = groupName(columnGroup);
      const rows = [
        ["Jaccard index", overlap.value.toFixed(4)],
        ["Compared on", measure.label],
        ["Shared", `${overlap.sharedCount} of ${overlap.unionSize} in the union`],
        ...(sameGroup ? [] : [
          [`Only in ${rowName}`, String(rowGenes.size - overlap.sharedCount)],
          [`Only in ${columnName}`, String(columnGenes.size - overlap.sharedCount)],
        ]),
        ...(geneIdsMode ? [] : [[
          "Genes without data (NA)",
          sameGroup ? String(countGenesWithoutData(rowGroup, measure)) : `${rowName}: ${countGenesWithoutData(rowGroup, measure)} · ${columnName}: ${countGenesWithoutData(columnGroup, measure)}`,
        ]]),
      ];
      const sharedItems = overlap.shared.map((value) => {
        if (geneIdsMode) {
          const { description } = rowGenes.get(value)[0];
          return description ? `${value} - ${description}` : value;
        }
        const rowCount = rowGenes.get(value).length;
        const columnCount = columnGenes.get(value).length;
        return sameGroup ? `${value} (${rowCount} genes)` : `${value} (${rowName}: ${rowCount} genes · ${columnName}: ${columnCount} genes)`;
      });
      return {
        heading: sameGroup ? rowName : `${rowName} vs ${columnName}`,
        rows,
        lists: [{ title: geneIdsMode ? `Shared genes (${overlap.sharedCount})` : `Shared ${measure.label.toLowerCase()} (${overlap.sharedCount})`, items: sharedItems }],
      };
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.on("click", (event) => { if (event.target === svg.node()) unpinPanel(); }); // empty space closes the pinned details
    zoomApi.current = null;

    addText(svg, stable, { x: MARGIN.left + gridSize / 2, y: 30, text: labelOf("title", DEFAULT_TITLE), key: "title", className: "chart-title" });
    addText(svg, stable, { x: MARGIN.left + gridSize / 2, y: MARGIN.top + gridSize + 110, text: labelOf("xlabel", "Groups"), key: "xlabel", className: "chart-axis-title" });
    addText(svg, stable, { x: 18, y: MARGIN.top + gridSize / 2, text: labelOf("ylabel", "Groups"), key: "ylabel", className: "chart-axis-title", rotate: -90 });

    const grid = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    groups.forEach((rowGroup) => {
      groups.forEach((columnGroup) => {
        const overlap = jaccard([...genesByValue.get(rowGroup.id).keys()], [...genesByValue.get(columnGroup.id).keys()]);
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
            `Compared on: ${measure.label}`,
            `Shared: ${overlap.sharedCount} of ${overlap.unionSize} in the union`,
            overlap.sharedCount ? `Click to see the shared ${geneIdsMode ? "genes" : measure.label.toLowerCase()}` : "Nothing shared",
          ]))
          .on("mouseleave", hideTooltip)
          .on("click", (event) => pinPanel(event, describeOverlap(rowGroup, columnGroup, overlap)));
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
    frameBox(legend, 12);
  }, [groups, measure, labels, colorScaleKey, svgRef, zoomApi, showTooltip, hideTooltip, pinPanel, unpinPanel, stable]);

  const toolbar = availableMeasures.length > 1 && (
    <div className="chart-toolbar">
      <label className="chart-toolbar__label" htmlFor="heatmap-measure">Compare groups by:</label>
      <select id="heatmap-measure" className="field__control" value={measure.key} onChange={(event) => onMeasureChange(event.target.value)}>
        {availableMeasures.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
    </div>
  );

  const scaleMenu = scaleMenuOpen && (
    <div className="heatmap__scale-menu">
      <div className="heatmap__scale-menu-title">Colour scale</div>
      {COLOR_SCALES.map((scale) => (
        <button
          key={scale.key} type="button"
          className={`heatmap__scale-option ${scale.key === colorScaleKey ? "heatmap__scale-option--active" : ""}`}
          onClick={() => { setColorScaleKey(scale.key); setScaleMenuOpen(false); }}
        >
          <span className="heatmap__scale-preview" style={{ backgroundImage: gradientCss(scale) }} />
          {scale.label}
        </button>
      ))}
    </div>
  );

  return <ChartView tools={tools} width={CHART_WIDTH} height={CHART_HEIGHT} toolbar={toolbar} overlay={scaleMenu} zoomable={false} pinHint="Click a square to see the shared genes." />;
}
