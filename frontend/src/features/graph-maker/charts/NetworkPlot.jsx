import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import ChartView from "./ChartView.jsx";
import Button from "../../../components/Button.jsx";
import { useChartTools } from "./useChartTools.js";
import { addText, frameBox, truncate, wrapWords } from "./svgText.js";
import { zoomFilter, zoomWheelDelta, enableWheelPan, disableZoom } from "./zoomHelpers.js";
import { cosine } from "../data/statistics.js";

const CHART_WIDTH = 980;
const MIN_CHART_HEIGHT = 640;
const MARGIN = { top: 56, right: 250, bottom: 20, left: 20 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = MIN_CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const DEFAULT_TITLE = "Gene graph (click to rename)";
const DEFAULT_THRESHOLD = 0.6;
const NODE_RADIUS = 9;
const EDGE_WIDTH_RANGE = [0.25, 2]; // pixels for a similarity of 0 and 1; lines grow with the zoom
const EDGE_LEGEND_SAMPLES = [0.25, 0.5, 0.75, 1];
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 40;
const PERFECT_MATCH = 0.999999; // cosine similarity counted as "equal to 1"

// Layout tuning: strong repulsion and a generous collision radius keep the nodes well apart.
const NEAREST_NEIGHBOURS_FOR_LAYOUT = 2;
const LAYOUT_TICKS = 400;
const LAYOUT_PADDING = 34;
const REPULSION_STRENGTH = -420;
const COLLISION_RADIUS = NODE_RADIUS * 3;

// Information boxes under the legend
const TOP_GENE_COUNT = 5;
const PERFECT_LIST_PREVIEW = 6; // genes shown before "Show more"
const BOX_LINE_HEIGHT = 18;
const BOX_TEXT_CHARS = 30;

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
    .force("link", d3.forceLink([...layoutLinks.values()]).distance((link) => 60 + (1 - link.similarity) * 500).strength(0.25))
    .force("charge", d3.forceManyBody().strength(REPULSION_STRENGTH))
    .force("collide", d3.forceCollide(COLLISION_RADIUS))
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

  return { nodes, pairs, ...summarizeConnections(nodes, pairs) };
}

/** Which genes are the best connected, and which have an identical (similarity 1) partner. */
function summarizeConnections(nodes, pairs) {
  const totalSimilarity = new Array(nodes.length).fill(0);
  const hasPerfectMatch = new Array(nodes.length).fill(false);
  pairs.forEach((pair) => {
    totalSimilarity[pair.source] += pair.similarity;
    totalSimilarity[pair.target] += pair.similarity;
    if (pair.similarity >= PERFECT_MATCH) {
      hasPerfectMatch[pair.source] = true;
      hasPerfectMatch[pair.target] = true;
    }
  });
  const topGenes = nodes
    .map((node, index) => ({ node, total: totalSimilarity[index] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_GENE_COUNT);
  const perfectGenes = nodes.filter((_, index) => hasPerfectMatch[index]);
  return { topGenes, perfectGenes };
}

/** Height of the chart: the legend and the two boxes have to fit under each other on the right. */
function chartHeightFor(groupCount, perfectGeneCount, showAllPerfect) {
  const legendHeight = 24 * groupCount + 142;
  const topBoxHeight = 36 + TOP_GENE_COUNT * BOX_LINE_HEIGHT + 20;
  const shownPerfect = showAllPerfect ? perfectGeneCount : Math.min(perfectGeneCount, PERFECT_LIST_PREVIEW);
  const perfectBoxHeight = 56 + Math.max(shownPerfect, 3) * BOX_LINE_HEIGHT + 20;
  const needed = MARGIN.top + 14 + legendHeight + 36 + topBoxHeight + 36 + perfectBoxHeight + 30;
  return Math.max(MIN_CHART_HEIGHT, needed);
}

/** groups: [{ id, name, color, genes: [{ id, description, similarity, embedding }] }] */
export default function NetworkPlot({ groups }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTooltip, hideTooltip, stable } = tools;
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [layoutVersion, setLayoutVersion] = useState(0); // bumping it lays the nodes out again
  const [showAllPerfect, setShowAllPerfect] = useState(false);
  // Dragged positions live on the node objects, so they survive slider changes and re-renders.
  const graph = useMemo(() => buildGraph(groups), [groups, layoutVersion]);
  const visibleEdgeCount = useMemo(() => graph.pairs.filter((pair) => pair.similarity >= threshold).length, [graph, threshold]);
  const chartHeight = chartHeightFor(groups.length, graph.perfectGenes.length, showAllPerfect);

  useEffect(() => {
    const labelOf = (key, fallback) => labels[key] ?? fallback;
    const { nodes, pairs, topGenes, perfectGenes } = graph;
    const edgeWidth = d3.scaleLinear().domain([0, 1]).range(EDGE_WIDTH_RANGE);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    addText(svg, stable, { x: MARGIN.left + PLOT_WIDTH / 2, y: 30, text: labelOf("title", DEFAULT_TITLE), key: "title", className: "chart-title" });

    // ---- right column: legend, then two information boxes ----
    const columnX = CHART_WIDTH - MARGIN.right + 34;
    const legend = svg.append("g").attr("transform", `translate(${columnX},${MARGIN.top + 14})`);
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
      legend.append("line").attr("class", "network__edge").attr("x1", 0).attr("x2", 40).attr("y1", legendY - 4).attr("y2", legendY - 4).attr("stroke-width", edgeWidth(similarity) * 2);
      legend.append("text").attr("class", "chart-tick-label").attr("x", 50).attr("y", legendY).text(similarity.toFixed(2));
    });
    frameBox(legend);

    // box 1: the best connected genes
    let boxY = MARGIN.top + 14 + legendY + 36;
    const topBox = svg.append("g").attr("transform", `translate(${columnX},${boxY})`);
    topBox.append("text").attr("class", "chart-legend-category").attr("y", 0).text(`Top ${TOP_GENE_COUNT} connected genes`);
    topBox.append("text").attr("class", "chart-hint-label").attr("y", 15).text("sum of similarity to all other genes");
    topGenes.forEach(({ node, total }, index) => {
      topBox.append("text").attr("class", "chart-legend-label").attr("y", 38 + index * BOX_LINE_HEIGHT)
        .text(`${index + 1}. ${truncate(node.id, 18)}`)
        .append("title").text(node.id);
      topBox.append("text").attr("class", "chart-tick-label chart-text--end").attr("x", MARGIN.right - 68).attr("y", 38 + index * BOX_LINE_HEIGHT).text(total.toFixed(2));
    });
    frameBox(topBox);

    // box 2: genes with a perfect (1) match
    boxY += 36 + TOP_GENE_COUNT * BOX_LINE_HEIGHT + 20 + 36;
    const perfectBox = svg.append("g").attr("transform", `translate(${columnX},${boxY})`);
    perfectBox.append("text").attr("class", "chart-legend-category").attr("y", 0).text("Perfect matches (similarity = 1)");
    if (!perfectGenes.length) {
      wrapWords("None of the genes has a perfect (1) annotation match with others", BOX_TEXT_CHARS).forEach((line, index) => {
        perfectBox.append("text").attr("class", "chart-legend-label").attr("y", 24 + index * BOX_LINE_HEIGHT).text(line);
      });
    } else {
      const shownGenes = showAllPerfect ? perfectGenes : perfectGenes.slice(0, PERFECT_LIST_PREVIEW);
      shownGenes.forEach((node, index) => {
        perfectBox.append("text").attr("class", "chart-legend-label").attr("y", 24 + index * BOX_LINE_HEIGHT)
          .text(truncate(node.id, 30)).append("title").text(node.id);
      });
      if (perfectGenes.length > PERFECT_LIST_PREVIEW) {
        perfectBox.append("text").attr("class", "chart-link").attr("y", 24 + shownGenes.length * BOX_LINE_HEIGHT + 4)
          .text(showAllPerfect ? "Show less" : `Show more (${perfectGenes.length - PERFECT_LIST_PREVIEW} more)`)
          .on("click", () => setShowAllPerfect((open) => !open));
      }
    }
    frameBox(perfectBox);

    // ---- the network itself ----
    svg.append("defs").append("clipPath").attr("id", "network-clip")
      .append("rect").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
    const canvas = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`).attr("clip-path", "url(#network-clip)");
    canvas.append("rect").attr("class", "network__canvas").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
    const world = canvas.append("g");

    // Lines sit behind the nodes; the strongest are drawn last so they stay on top of the weaker ones.
    const visiblePairs = pairs.filter((pair) => pair.similarity >= threshold).sort((a, b) => a.similarity - b.similarity);
    const moveEdge = (selection) => selection
      .attr("x1", (pair) => nodes[pair.source].screenX).attr("y1", (pair) => nodes[pair.source].screenY)
      .attr("x2", (pair) => nodes[pair.target].screenX).attr("y2", (pair) => nodes[pair.target].screenY);
    const edgeSelection = world.append("g").selectAll("line").data(visiblePairs).join("line")
      .attr("class", "network__edge")
      .attr("stroke-width", (pair) => edgeWidth(pair.similarity))
      .call(moveEdge)
      .on("mousemove", (event, pair) => showTooltip(event, [
        `${nodes[pair.source].id} - ${nodes[pair.target].id}`,
        `Similarity: ${pair.similarity.toFixed(3)}`,
      ]))
      .on("mouseleave", hideTooltip);

    // Nodes can be dragged to make room; the lines follow. Dragging uses world coordinates, so it works while zoomed.
    const dragNode = d3.drag()
      .container(world.node())
      .subject((event, node) => ({ x: node.screenX, y: node.screenY }))
      .on("start", () => hideTooltip())
      .on("drag", function (event, node) {
        node.screenX = event.x;
        node.screenY = event.y;
        d3.select(this).attr("cx", node.screenX).attr("cy", node.screenY);
        const nodeIndex = nodes.indexOf(node);
        edgeSelection.filter((pair) => pair.source === nodeIndex || pair.target === nodeIndex).call(moveEdge);
      });
    world.append("g").selectAll("circle").data(nodes).join("circle")
      .attr("class", "network__node")
      .attr("cx", (node) => node.screenX).attr("cy", (node) => node.screenY).attr("r", NODE_RADIUS)
      .attr("fill", (node) => node.group.color)
      .on("mousemove", (event, node) => showTooltip(event, [
        node.id,
        labelOf(`group:${node.group.id}`, node.group.name),
        ...(node.description ? [`Description: ${node.description}`] : []),
        ...(node.similarity !== null && node.similarity !== undefined ? [`Similarity to the query: ${Number(node.similarity).toFixed(3)}`] : []),
      ]))
      .on("mouseleave", hideTooltip)
      .call(dragNode);

    // Mouse wheel scrolls the graph up/down, Ctrl + wheel zooms, dragging the background pans.
    const zoomBehavior = d3.zoom()
      .filter(zoomFilter)
      .wheelDelta(zoomWheelDelta)
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("zoom", (event) => { zoomTransformRef.current = event.transform; world.attr("transform", event.transform); });
    canvas.call(zoomBehavior).on("dblclick.zoom", null);
    enableWheelPan(canvas, zoomBehavior, () => zoomTransformRef.current.k);
    const animated = () => canvas.transition().duration(250);
    zoomApi.current = {
      reset: () => animated().call(zoomBehavior.transform, d3.zoomIdentity),
      zoomIn: () => animated().call(zoomBehavior.scaleBy, 1.6),
      zoomOut: () => animated().call(zoomBehavior.scaleBy, 1 / 1.6),
    };
    canvas.call(zoomBehavior.transform, zoomTransformRef.current);

    return () => disableZoom(canvas);
  }, [graph, groups, threshold, labels, showAllPerfect, chartHeight, svgRef, zoomApi, showTooltip, hideTooltip, stable]);

  const toolbar = (
    <div className="chart-toolbar">
      <label className="chart-toolbar__label" htmlFor="network-threshold">Minimum similarity:</label>
      <input
        id="network-threshold" type="range" min="0" max="1" step="0.01"
        value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}
        className="chart-toolbar__slider"
      />
      <span className="chart-toolbar__value">{threshold.toFixed(2)}</span>
      <span className="chart-toolbar__note">{visibleEdgeCount} of {graph.pairs.length} lines shown</span>
      <Button size="small" onClick={() => setLayoutVersion((version) => version + 1)}>Reset node positions</Button>
      <span className="chart-toolbar__note">Drag a node to move it.</span>
    </div>
  );

  const hint = "Scroll to move the graph up/down, drag the background to pan, Ctrl + scroll (or + / -) to zoom. Click any text to rename it.";
  return <ChartView tools={tools} width={CHART_WIDTH} height={chartHeight} toolbar={toolbar} hint={hint} />;
}
