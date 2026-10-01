import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import ChartView from "./ChartView.jsx";
import { useChartTools } from "./useChartTools.js";
import { addText, frameBox, truncate } from "./svgText.js";
import { zoomFilter, zoomWheelDelta, disableZoom } from "./zoomHelpers.js";

const CHART_WIDTH = 980;
const DEFAULT_TITLE = "Gene graph (click to rename)";
const GAP_BETWEEN_CLUSTERS = 2; // measured in bar widths
const MIN_BAR_WIDTH_FOR_GENE_LABELS = 11; // pixels
const MAX_ZOOM = 80;
const HOVER_VALUE_MAX_CHARS = 60; // longer values are cut in the hover box; the pinned panel shows them in full

/**
 * Lay the categories out left to right. Every bar is one "bar unit" wide and
 * each category (cluster) is separated from the next by a gap of a few units.
 */
function layoutClusters(categories) {
  const clusters = [];
  let nextBarUnit = 0;
  categories.forEach((category) => {
    const bars = category.groups.flatMap((group) =>
      group.genes.map((gene) => ({ ...gene, group, category })));
    if (!bars.length) return;
    if (clusters.length) nextBarUnit += GAP_BETWEEN_CLUSTERS;
    const firstUnit = nextBarUnit;
    bars.forEach((bar) => { bar.unit = nextBarUnit++; });
    clusters.push({ category, bars, firstUnit, endUnit: nextBarUnit });
  });
  return { clusters, totalUnits: Math.max(nextBarUnit, 1) };
}

/**
 * What is worth naming: category names only matter with several categories,
 * and a legend only matters when there is more than one dataset to tell apart.
 */
function describeLayout(categories) {
  const filled = categories.filter((category) => category.groups.some((group) => group.genes.length));
  const groupCount = filled.reduce((total, category) => total + category.groups.length, 0);
  const showCategoryLabels = filled.length > 1;
  const showLegend = groupCount > 1;
  const margin = {
    top: 56,
    right: showLegend ? 210 : 40,
    bottom: showCategoryLabels ? 120 : 90,
    left: 70,
  };
  const height = showCategoryLabels ? 590 : 540;
  return { showCategoryLabels, showLegend, margin, height };
}

/**
 * categories: [{ id, name, groups: [{ id, name, color, genes: [{ id, value, details: [[label, text], ...] }] }] }]
 * valueLabel: what the bars measure, e.g. "Similarity score" or "Length".
 */
export default function BarPlot({ categories, valueLabel }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTooltip, hideTooltip, pinPanel, unpinPanel, stable } = tools;
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const layout = useMemo(() => describeLayout(categories), [categories]);

  useEffect(() => {
    const { showCategoryLabels, showLegend, margin, height: chartHeight } = layout;
    const plotWidth = CHART_WIDTH - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;
    const labelOf = (key, fallback) => labels[key] ?? fallback;

    const { clusters, totalUnits } = layoutClusters(categories);
    const allValues = clusters.flatMap((cluster) => cluster.bars.map((bar) => bar.value));
    const baseYScale = d3.scaleLinear()
      .domain([Math.min(0, d3.min(allValues) ?? 0), Math.max(d3.max(allValues) ?? 1, 0.01) * 1.05])
      .range([plotHeight, 0])
      .nice();

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ---- fixed parts: title, axis titles, legend ----
    addText(svg, stable, { x: margin.left + plotWidth / 2, y: 30, text: labelOf("title", DEFAULT_TITLE), key: "title", className: "chart-title" });
    addText(svg, stable, { x: margin.left + plotWidth / 2, y: chartHeight - 10, text: labelOf("xlabel", "Genes"), key: "xlabel", className: "chart-axis-title" });
    addText(svg, stable, { x: 18, y: margin.top + plotHeight / 2, text: labelOf("ylabel", valueLabel), key: "ylabel", className: "chart-axis-title", rotate: -90 });

    if (showLegend) {
      const legend = svg.append("g").attr("transform", `translate(${CHART_WIDTH - margin.right + 34},${margin.top + 14})`);
      let legendY = 0;
      addText(legend, stable, { x: 0, y: legendY, text: labelOf("legend", "Legend"), key: "legend", className: "chart-legend-heading" });
      clusters.forEach(({ category }) => {
        legendY += 26;
        if (showCategoryLabels) {
          addText(legend, stable, { x: 0, y: legendY, text: labelOf(`cat:${category.id}`, category.name), key: `cat:${category.id}`, className: "chart-legend-category" });
        } else {
          legendY -= 4;
        }
        category.groups.forEach((group) => {
          legendY += 22;
          legend.append("rect").attr("class", "chart-legend-swatch").attr("x", 4).attr("y", legendY - 11).attr("width", 12).attr("height", 12).attr("fill", group.color);
          addText(legend, stable, { x: 24, y: legendY, text: labelOf(`group:${group.id}`, group.name), key: `group:${group.id}`, className: "chart-legend-label" });
        });
      });
      frameBox(legend);
    }

    svg.append("defs").append("clipPath").attr("id", "bar-plot-clip")
      .append("rect").attr("width", plotWidth).attr("height", plotHeight);

    // ---- zoomable part ----
    const plotRoot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    plotRoot.append("rect").attr("class", "chart-hit-area").attr("width", plotWidth).attr("height", plotHeight)
      .on("click", unpinPanel); // a click on empty space closes the pinned details
    const plotContent = plotRoot.append("g");

    const render = (zoomTransform) => {
      hideTooltip();
      plotContent.selectAll("*").remove();
      const pixelsPerUnit = (plotWidth / totalUnits) * zoomTransform.k;
      const unitToX = (unit) => zoomTransform.applyX((unit / totalUnits) * plotWidth);
      const yScale = zoomTransform.rescaleY(baseYScale);
      const zeroY = yScale(0);

      // grid lines and y axis labels
      yScale.ticks(6).filter((tick) => yScale(tick) >= 0 && yScale(tick) <= plotHeight).forEach((tick) => {
        plotContent.append("line").attr("class", "chart-gridline").attr("x1", 0).attr("x2", plotWidth).attr("y1", yScale(tick)).attr("y2", yScale(tick));
        plotContent.append("text").attr("class", "chart-tick-label chart-text--end").attr("x", -8).attr("y", yScale(tick) + 4).text(d3.format("~g")(tick));
      });

      // bars
      const barLayer = plotContent.append("g").attr("clip-path", "url(#bar-plot-clip)");
      clusters.forEach(({ category, bars }) => {
        bars.forEach((bar) => {
          const barX = unitToX(bar.unit);
          if (barX + pixelsPerUnit < 0 || barX > plotWidth) return;
          const barTopY = yScale(bar.value);
          const where = showCategoryLabels
            ? `${labelOf(`cat:${category.id}`, category.name)} / ${labelOf(`group:${bar.group.id}`, bar.group.name)}`
            : labelOf(`group:${bar.group.id}`, bar.group.name);
          barLayer.append("rect")
            .attr("class", "bar-plot__bar")
            .attr("x", barX + pixelsPerUnit * 0.1)
            .attr("width", Math.max(pixelsPerUnit * 0.8, 0.5))
            .attr("y", Math.min(barTopY, zeroY))
            .attr("height", Math.abs(zeroY - barTopY))
            .attr("fill", bar.group.color)
            .on("mousemove", (event) => showTooltip(event, [
              bar.id,
              `${labelOf("ylabel", valueLabel)}: ${d3.format(",~g")(bar.value)}`,
              ...(showLegend ? [where] : []),
              // everything else that was pasted but not plotted (long values are shortened here)
              ...bar.details.map(([label, text]) => `${label}: ${truncate(text, HOVER_VALUE_MAX_CHARS)}`),
              ...(bar.details.length ? ["Click to keep the full details open"] : []),
            ]))
            .on("mouseleave", hideTooltip)
            .on("click", (event) => pinPanel(event, {
              heading: bar.id,
              rows: [
                [labelOf("ylabel", valueLabel), d3.format(",~g")(bar.value)],
                ...(showLegend ? [["Group", where]] : []),
                ...bar.details,
              ],
            }));
        });
      });

      // axis lines
      if (zeroY >= 0 && zeroY <= plotHeight) {
        plotContent.append("line").attr("class", "chart-axis-line").attr("x1", 0).attr("x2", plotWidth).attr("y1", zeroY).attr("y2", zeroY);
      }
      plotContent.append("line").attr("class", "chart-axis-line").attr("y1", 0).attr("y2", plotHeight);
      plotContent.append("line").attr("class", "chart-axis-line").attr("x1", 0).attr("x2", plotWidth).attr("y1", plotHeight).attr("y2", plotHeight);

      // gene names appear once the bars are wide enough
      if (pixelsPerUnit >= MIN_BAR_WIDTH_FOR_GENE_LABELS) {
        clusters.forEach(({ bars }) => bars.forEach((bar) => {
          const labelX = unitToX(bar.unit) + pixelsPerUnit / 2;
          if (labelX < 0 || labelX > plotWidth) return;
          plotContent.append("text").attr("class", "chart-tick-label")
            .attr("x", labelX).attr("y", plotHeight + 10)
            .attr("transform", `rotate(45 ${labelX} ${plotHeight + 10})`).text(bar.id);
        }));
      }

      // category names under each cluster (only when there are several)
      if (showCategoryLabels) {
        const clusterLabelY = plotHeight + 100;
        clusters.forEach(({ category, firstUnit, endUnit }) => {
          const leftX = Math.max(unitToX(firstUnit), 0);
          const rightX = Math.min(unitToX(endUnit), plotWidth);
          if (rightX <= leftX) return;
          plotContent.append("line").attr("class", "chart-cluster-bracket")
            .attr("x1", leftX).attr("x2", rightX).attr("y1", clusterLabelY - 16).attr("y2", clusterLabelY - 16);
          addText(plotContent, stable, {
            x: (leftX + rightX) / 2, y: clusterLabelY,
            text: labelOf(`cat:${category.id}`, category.name), key: `cat:${category.id}`, className: "chart-axis-title",
          });
        });
      }
    };

    const zoomBehavior = d3.zoom()
      .filter(zoomFilter)
      .wheelDelta(zoomWheelDelta)
      .scaleExtent([1, MAX_ZOOM])
      .extent([[0, 0], [plotWidth, plotHeight]])
      .translateExtent([[0, 0], [plotWidth, plotHeight]])
      .on("zoom", (event) => { zoomTransformRef.current = event.transform; render(event.transform); });
    plotRoot.call(zoomBehavior).on("dblclick.zoom", null);
    const animated = () => plotRoot.transition().duration(250);
    zoomApi.current = {
      reset: () => animated().call(zoomBehavior.transform, d3.zoomIdentity),
      zoomIn: () => animated().call(zoomBehavior.scaleBy, 1.6),
      zoomOut: () => animated().call(zoomBehavior.scaleBy, 1 / 1.6),
    };
    plotRoot.call(zoomBehavior.transform, zoomTransformRef.current);

    return () => disableZoom(plotRoot);
  }, [categories, valueLabel, layout, labels, svgRef, zoomApi, showTooltip, hideTooltip, pinPanel, unpinPanel, stable]);

  return <ChartView tools={tools} width={CHART_WIDTH} height={layout.height} pinHint="Click a bar to keep its details open." />;
}
