import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { ChartView, addText, frameLegend, useChartTools, zoomFilter, zoomWheelDelta } from "./ChartTools.jsx";

const CHART_WIDTH = 980;
const CHART_HEIGHT = 590;
const MARGIN = { top: 56, right: 210, bottom: 120, left: 70 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const DEFAULT_TITLE = "Gene graph (click to rename)";
const GAP_BETWEEN_CLUSTERS = 2; // measured in bar widths
const MIN_BAR_WIDTH_FOR_GENE_LABELS = 11; // pixels
const MAX_ZOOM = 80;

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

/** categories: [{id, name, groups: [{id, name, color, genes: [{id, score, description}]}]}] */
export default function BarPlot({ categories }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTooltip, hideTooltip, stable } = tools;
  const zoomTransformRef = useRef(d3.zoomIdentity);

  useEffect(() => {
    const labelOf = (key, fallback) => labels[key] ?? fallback;
    const { clusters, totalUnits } = layoutClusters(categories);
    const allScores = clusters.flatMap((cluster) => cluster.bars.map((bar) => bar.score));
    const baseYScale = d3.scaleLinear()
      .domain([Math.min(0, d3.min(allScores) ?? 0), Math.max(d3.max(allScores) ?? 1, 0.01) * 1.05])
      .range([PLOT_HEIGHT, 0])
      .nice();

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ---- fixed parts: title, axis titles, legend ----
    addText(svg, stable, { x: MARGIN.left + PLOT_WIDTH / 2, y: 30, text: labelOf("title", DEFAULT_TITLE), key: "title", className: "chart-title" });
    addText(svg, stable, { x: MARGIN.left + PLOT_WIDTH / 2, y: CHART_HEIGHT - 10, text: labelOf("xlabel", "Genes"), key: "xlabel", className: "chart-axis-title" });
    addText(svg, stable, { x: 18, y: MARGIN.top + PLOT_HEIGHT / 2, text: labelOf("ylabel", "Similarity score"), key: "ylabel", className: "chart-axis-title", rotate: -90 });

    const legend = svg.append("g").attr("transform", `translate(${CHART_WIDTH - MARGIN.right + 34},${MARGIN.top + 14})`);
    let legendY = 0;
    addText(legend, stable, { x: 0, y: legendY, text: labelOf("legend", "Legend"), key: "legend", className: "chart-legend-heading" });
    clusters.forEach(({ category }) => {
      legendY += 26;
      addText(legend, stable, { x: 0, y: legendY, text: labelOf(`cat:${category.id}`, category.name), key: `cat:${category.id}`, className: "chart-legend-category" });
      category.groups.forEach((group) => {
        legendY += 22;
        legend.append("rect").attr("class", "chart-legend-swatch").attr("x", 4).attr("y", legendY - 11).attr("width", 12).attr("height", 12).attr("fill", group.color);
        addText(legend, stable, { x: 24, y: legendY, text: labelOf(`group:${group.id}`, group.name), key: `group:${group.id}`, className: "chart-legend-label" });
      });
    });
    frameLegend(legend);

    svg.append("defs").append("clipPath").attr("id", "bar-plot-clip")
      .append("rect").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);

    // ---- zoomable part ----
    const plotRoot = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    plotRoot.append("rect").attr("class", "chart-hit-area").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
    const plotContent = plotRoot.append("g");

    const render = (zoomTransform) => {
      hideTooltip();
      plotContent.selectAll("*").remove();
      const pixelsPerUnit = (PLOT_WIDTH / totalUnits) * zoomTransform.k;
      const unitToX = (unit) => zoomTransform.applyX((unit / totalUnits) * PLOT_WIDTH);
      const yScale = zoomTransform.rescaleY(baseYScale);
      const zeroY = yScale(0);

      // grid lines and y axis labels
      const yTicks = yScale.ticks(6).filter((tick) => yScale(tick) >= 0 && yScale(tick) <= PLOT_HEIGHT);
      yTicks.forEach((tick) => {
        plotContent.append("line").attr("class", "chart-gridline").attr("x1", 0).attr("x2", PLOT_WIDTH).attr("y1", yScale(tick)).attr("y2", yScale(tick));
        plotContent.append("text").attr("class", "chart-tick-label chart-text--end").attr("x", -8).attr("y", yScale(tick) + 4).text(d3.format("~g")(tick));
      });

      // bars
      const barLayer = plotContent.append("g").attr("clip-path", "url(#bar-plot-clip)");
      clusters.forEach(({ category, bars }) => {
        bars.forEach((bar) => {
          const barX = unitToX(bar.unit);
          if (barX + pixelsPerUnit < 0 || barX > PLOT_WIDTH) return;
          const barTopY = yScale(bar.score);
          barLayer.append("rect")
            .attr("class", "bar-plot__bar")
            .attr("x", barX + pixelsPerUnit * 0.1)
            .attr("width", Math.max(pixelsPerUnit * 0.8, 0.5))
            .attr("y", Math.min(barTopY, zeroY))
            .attr("height", Math.abs(zeroY - barTopY))
            .attr("fill", bar.group.color)
            .on("mousemove", (event) => showTooltip(event, [
              bar.id,
              `Similarity score: ${Number(bar.score).toFixed(3)}`,
              `${labelOf(`cat:${category.id}`, category.name)} / ${labelOf(`group:${bar.group.id}`, bar.group.name)}`,
              bar.description || "(no description)",
            ]))
            .on("mouseleave", hideTooltip);
        });
      });

      // axis lines
      if (zeroY >= 0 && zeroY <= PLOT_HEIGHT) {
        plotContent.append("line").attr("class", "chart-axis-line").attr("x1", 0).attr("x2", PLOT_WIDTH).attr("y1", zeroY).attr("y2", zeroY);
      }
      plotContent.append("line").attr("class", "chart-axis-line").attr("y1", 0).attr("y2", PLOT_HEIGHT);
      plotContent.append("line").attr("class", "chart-axis-line").attr("x1", 0).attr("x2", PLOT_WIDTH).attr("y1", PLOT_HEIGHT).attr("y2", PLOT_HEIGHT);

      // gene names appear once the bars are wide enough, cluster names always
      if (pixelsPerUnit >= MIN_BAR_WIDTH_FOR_GENE_LABELS) {
        clusters.forEach(({ bars }) => bars.forEach((bar) => {
          const labelX = unitToX(bar.unit) + pixelsPerUnit / 2;
          if (labelX < 0 || labelX > PLOT_WIDTH) return;
          plotContent.append("text").attr("class", "chart-tick-label")
            .attr("x", labelX).attr("y", PLOT_HEIGHT + 10)
            .attr("transform", `rotate(45 ${labelX} ${PLOT_HEIGHT + 10})`).text(bar.id);
        }));
      }
      const clusterLabelY = PLOT_HEIGHT + 100;
      clusters.forEach(({ category, firstUnit, endUnit }) => {
        const leftX = Math.max(unitToX(firstUnit), 0);
        const rightX = Math.min(unitToX(endUnit), PLOT_WIDTH);
        if (rightX <= leftX) return;
        plotContent.append("line").attr("class", "chart-cluster-bracket")
          .attr("x1", leftX).attr("x2", rightX).attr("y1", clusterLabelY - 16).attr("y2", clusterLabelY - 16);
        addText(plotContent, stable, {
          x: (leftX + rightX) / 2, y: clusterLabelY,
          text: labelOf(`cat:${category.id}`, category.name), key: `cat:${category.id}`, className: "chart-category-label",
        });
      });
    };

    const zoomBehavior = d3.zoom()
      .filter(zoomFilter)
      .wheelDelta(zoomWheelDelta)
      .scaleExtent([1, MAX_ZOOM])
      .extent([[0, 0], [PLOT_WIDTH, PLOT_HEIGHT]])
      .translateExtent([[0, 0], [PLOT_WIDTH, PLOT_HEIGHT]])
      .on("zoom", (event) => { zoomTransformRef.current = event.transform; render(event.transform); });
    plotRoot.call(zoomBehavior).on("dblclick.zoom", null);
    const animated = () => plotRoot.transition().duration(250);
    zoomApi.current = {
      reset: () => animated().call(zoomBehavior.transform, d3.zoomIdentity),
      zoomIn: () => animated().call(zoomBehavior.scaleBy, 1.6),
      zoomOut: () => animated().call(zoomBehavior.scaleBy, 1 / 1.6),
    };
    plotRoot.call(zoomBehavior.transform, zoomTransformRef.current);

    return () => plotRoot.on(".zoom", null);
  }, [categories, labels, svgRef, zoomApi, showTooltip, hideTooltip, stable]);

  return <ChartView tools={tools} width={CHART_WIDTH} height={CHART_HEIGHT} />;
}
