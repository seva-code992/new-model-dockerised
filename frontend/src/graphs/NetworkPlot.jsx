import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ChartView, addText, frameLegend, useChartTools } from "./ChartTools.jsx";
import { cosine } from "./chartUtils.js";

const CHART_WIDTH = 980;
const CHART_HEIGHT = 640;
const MARGIN = { top: 56, right: 250, bottom: 20, left: 20 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const DEFAULT_TITLE = "Gene graph (click to rename)";
const DEFAULT_THRESHOLD = 0.6;
const NODE_RADIUS = 7;
const NEAREST_NEIGHBOURS_FOR_LAYOUT = 3;
const LAYOUT_TICKS = 300;
const LAYOUT_PADDING = 24;
const EDGE_LEGEND_SAMPLES = [0.25, 0.5, 0.75, 1];

/**
 * Nodes are placed once from the embeddings; the slider later only decides which lines are drawn.
 * Every pair of genes gets a cosine similarity of its embeddings.
 */
function buildGraph(groups) {
  const nodes = groups.flatMap((group) =>
    group.genes.map((gene) => ({ ...gene, group, key: `${group.id}:${gene.id}` })));

  const pairs = [];
  for (let first = 0; first < nodes.length; first++) {
    for (let second = first + 1; second < nodes.length; second++) {
      pairs.push({ source: first, target: second, similarity: cosine(nodes[first].embedding, nodes[second].embedding) });
    }
  }

  // Layout: each node is pulled towards its most similar neighbours, all nodes push each other apart.
  const layoutLinks = new Map();
  nodes.forEach((_, nodeIndex) => {
    pairs
      .filter((pair) => pair.source === nodeIndex || pair.target === nodeIndex)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, NEAREST_NEIGHBOURS_FOR_LAYOUT)
      .forEach((pair) => layoutLinks.set(`${pair.source}-${pair.target}`, { ...pair }));
  });
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink([...layoutLinks.values()]).distance((link) => 30 + (1 - link.similarity) * 400).strength(0.4))
    .force("charge", d3.forceManyBody().strength(-90))
    .force("collide", d3.forceCollide(NODE_RADIUS * 2))
    .force("center", d3.forceCenter(PLOT_WIDTH / 2, PLOT_HEIGHT / 2))
    .stop();
  simulation.tick(LAYOUT_TICKS);

  // Stretch the layout so it fills the canvas.
  const fitTo = (values, length) => {
    const [min, max] = d3.extent(values);
    return d3.scaleLinear().domain(min === max ? [min - 1, max + 1] : [min, max]).range([LAYOUT_PADDING, length - LAYOUT_PADDING]);
  };
  const fitX = fitTo(nodes.map((node) => node.x), PLOT_WIDTH);
  const fitY = fitTo(nodes.map((node) => node.y), PLOT_HEIGHT);
  nodes.forEach((node) => { node.screenX = fitX(node.x); node.screenY = fitY(node.y); });
  return { nodes, pairs };
}

/** groups: [{id, name, color, genes: [{id, description, embedding}]}] */
export default function NetworkPlot({ groups }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTooltip, hideTooltip, stable } = tools;
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const graph = useMemo(() => buildGraph(groups), [groups]);
  const visibleEdgeCount = useMemo(() => graph.pairs.filter((pair) => pair.similarity >= threshold).length, [graph, threshold]);

  useEffect(() => {
    const labelOf = (key, fallback) => labels[key] ?? fallback;
    const { nodes, pairs } = graph;
    const edgeWidth = d3.scaleLinear().domain([0, 1]).range([0.4, 7]);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    addText(svg, stable, { x: MARGIN.left + PLOT_WIDTH / 2, y: 30, text: labelOf("title", DEFAULT_TITLE), key: "title", className: "chart-title" });

    // legend: one coloured dot per group, plus a key for the line thickness
    const legend = svg.append("g").attr("transform", `translate(${CHART_WIDTH - MARGIN.right + 34},${MARGIN.top + 14})`);
    let legendY = 0;
    addText(legend, stable, { x: 0, y: legendY, text: labelOf("legend", "Legend"), key: "legend", className: "chart-legend-heading" });
    groups.forEach((group) => {
      legendY += 24;
      legend.append("circle").attr("class", "network__legend-dot").attr("cx", 8).attr("cy", legendY - 4).attr("r", 6).attr("fill", group.color);
      addText(legend, stable, { x: 24, y: legendY, text: labelOf(`group:${group.id}`, group.name), key: `group:${group.id}`, className: "chart-legend-label" });
    });
    legendY += 34;
    addText(legend, stable, { x: 0, y: legendY, text: labelOf("edgelegend", "Line thickness = similarity"), key: "edgelegend", className: "chart-legend-category" });
    EDGE_LEGEND_SAMPLES.forEach((similarity) => {
      legendY += 22;
      legend.append("line").attr("class", "network__edge").attr("x1", 0).attr("x2", 40).attr("y1", legendY - 4).attr("y2", legendY - 4).attr("stroke-width", edgeWidth(similarity));
      legend.append("text").attr("class", "chart-tick-label").attr("x", 50).attr("y", legendY).text(similarity.toFixed(2));
    });
    frameLegend(legend);

    svg.append("defs").append("clipPath").attr("id", "network-clip")
      .append("rect").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
    const canvas = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`).attr("clip-path", "url(#network-clip)");
    canvas.append("rect").attr("class", "network__canvas").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
    const world = canvas.append("g");

    // Lines are opaque; the strongest are drawn last so they stay on top.
    const edgeLayer = world.append("g");
    pairs
      .filter((pair) => pair.similarity >= threshold)
      .sort((a, b) => a.similarity - b.similarity)
      .forEach((pair) => {
        const from = nodes[pair.source];
        const to = nodes[pair.target];
        edgeLayer.append("line")
          .attr("class", "network__edge")
          .attr("x1", from.screenX).attr("y1", from.screenY).attr("x2", to.screenX).attr("y2", to.screenY)
          .attr("stroke-width", edgeWidth(pair.similarity))
          .on("mousemove", (event) => showTooltip(event, [`${from.id} - ${to.id}`, `Similarity: ${pair.similarity.toFixed(3)}`]))
          .on("mouseleave", hideTooltip);
      });

    const nodeLayer = world.append("g");
    nodes.forEach((node) => {
      nodeLayer.append("circle")
        .attr("class", "network__node")
        .attr("cx", node.screenX).attr("cy", node.screenY).attr("r", NODE_RADIUS)
        .attr("fill", node.group.color)
        .on("mousemove", (event) => showTooltip(event, [
          node.id,
          labelOf(`group:${node.group.id}`, node.group.name),
          node.description || "(no description)",
        ]))
        .on("mouseleave", hideTooltip);
    });

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 40])
      .on("zoom", (event) => { zoomTransformRef.current = event.transform; world.attr("transform", event.transform); });
    canvas.call(zoomBehavior).on("dblclick.zoom", null);
    zoomApi.current = { reset: () => canvas.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity) };
    canvas.call(zoomBehavior.transform, zoomTransformRef.current);

    return () => canvas.on(".zoom", null);
  }, [graph, groups, threshold, labels, svgRef, zoomApi, showTooltip, hideTooltip, stable]);

  const toolbar = (
    <div className="network__threshold">
      <label className="network__threshold-label" htmlFor="network-threshold">Minimum similarity:</label>
      <input
        id="network-threshold" type="range" min="0" max="1" step="0.01"
        value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}
        className="network__threshold-slider"
      />
      <span className="network__threshold-value">{threshold.toFixed(2)}</span>
      <span className="network__threshold-count">{visibleEdgeCount} of {graph.pairs.length} lines shown</span>
    </div>
  );

  return <ChartView tools={tools} width={CHART_WIDTH} height={CHART_HEIGHT} toolbar={toolbar} />;
}
