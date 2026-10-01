import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import ChartView from "./ChartView.jsx";
import Button from "../../../components/Button.jsx";
import { useChartTools } from "./useChartTools.js";
import { addText, frameBox, truncate, wrapWords } from "./svgText.js";
import { zoomFilter, zoomWheelDelta, enableWheelPan, disableZoom } from "./zoomHelpers.js";
import { cosine } from "../data/statistics.js";
import { TOP_GENE_COUNT, splitTopGenes, summarizeConnections } from "../data/networkStats.js";

const CHART_WIDTH = 980;
const MIN_CHART_HEIGHT = 640;
const MARGIN = { top: 56, right: 250, bottom: 20, left: 20 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = MIN_CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const DEFAULT_TITLE = "Gene graph (click to rename)";
const DEFAULT_THRESHOLD = 0.6;
const NODE_RADIUS = 12;
const HIGHLIGHT_RING_RADIUS = NODE_RADIUS + 5;
const EDGE_WIDTH_RANGE = [0.25, 2]; // pixels for a similarity of 0 and 1; lines grow with the zoom
const EDGE_LEGEND_SAMPLES = [0.25, 0.5, 0.75, 1];
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 40;

// Layout tuning: strong repulsion and a generous collision radius keep the nodes well apart.
const NEAREST_NEIGHBOURS_FOR_LAYOUT = 2;
const LAYOUT_TICKS = 400;
const LAYOUT_PADDING = 40;
const REPULSION_STRENGTH = -480;
const COLLISION_RADIUS = NODE_RADIUS * 2.6;

// The column on the right: legend, then the information boxes, stacked with an even gap.
const COLUMN_X = CHART_WIDTH - MARGIN.right + 34;
const BOX_PADDING = 10;
const BOX_GAP = 10; // space between two framed boxes
const BOX_LINE_HEIGHT = 18;
const BOX_TEXT_CHARS = 30;
const BOX_VALUE_X = MARGIN.right - 68;
const PERFECT_LIST_PREVIEW = 6; // genes shown before "Show more"

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

  return { nodes, pairs };
}

/** Height of the chart: the legend and the two boxes have to fit under each other on the right. */
function chartHeightFor({ groupCount, topRows, topHasMore, perfectRows, perfectHasMore }) {
  const legendHeight = 24 * groupCount + 176;
  const topBoxHeight = 44 + topRows * BOX_LINE_HEIGHT + (topHasMore ? 22 : 0) + 20;
  const perfectBoxHeight = 28 + Math.max(perfectRows, 3) * BOX_LINE_HEIGHT + (perfectHasMore ? 22 : 0) + 20;
  const needed = MARGIN.top + legendHeight + topBoxHeight + perfectBoxHeight + 2 * BOX_GAP + 24;
  return Math.max(MIN_CHART_HEIGHT, needed);
}

/**
 * Draw one framed box of the right-hand column below `topY`.
 * `draw(group)` fills it; the box is measured and framed afterwards. Returns the y where the next box may start.
 */
function placeBox(svg, topY, draw) {
  const group = svg.append("g");
  draw(group);
  const content = group.node().getBBox();
  group.attr("transform", `translate(${COLUMN_X},${topY + BOX_PADDING - content.y})`);
  frameBox(group, BOX_PADDING);
  return topY + content.height + 2 * BOX_PADDING + BOX_GAP;
}

/** Toggle one item in a Set that lives in React state. */
const toggledSet = (set, item) => {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
};

/** groups: [{ id, name, color, genes: [{ id, description, similarity, embedding }] }] */
export default function NetworkPlot({ groups }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTooltip, hideTooltip, stable } = tools;
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [layoutVersion, setLayoutVersion] = useState(0); // bumping it lays the nodes out again
  const [hiddenGroupIds, setHiddenGroupIds] = useState(() => new Set()); // groups hidden via their legend dot
  const [highlightedKeys, setHighlightedKeys] = useState(() => new Set()); // genes picked in the boxes
  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllPerfect, setShowAllPerfect] = useState(false);

  // Dragged positions live on the node objects, so they survive slider changes and re-renders.
  const graph = useMemo(() => buildGraph(groups), [groups, layoutVersion]);
  const isVisible = useMemo(() => graph.nodes.map((node) => !hiddenGroupIds.has(node.group.id)), [graph, hiddenGroupIds]);
  const { ranked, perfectGenes } = useMemo(() => summarizeConnections(graph.nodes, graph.pairs, isVisible), [graph, isVisible]);
  const { top: topGenes, tiedExtra } = useMemo(() => splitTopGenes(ranked), [ranked]);
  const visibleEdgeCount = useMemo(
    () => graph.pairs.filter((pair) => pair.similarity >= threshold && isVisible[pair.source] && isVisible[pair.target]).length,
    [graph, threshold, isVisible],
  );

  const chartHeight = chartHeightFor({
    groupCount: groups.length,
    topRows: topGenes.length + (showAllTop ? tiedExtra.length : 0),
    topHasMore: tiedExtra.length > 0,
    perfectRows: showAllPerfect ? perfectGenes.length : Math.min(perfectGenes.length, PERFECT_LIST_PREVIEW),
    perfectHasMore: perfectGenes.length > PERFECT_LIST_PREVIEW,
  });

  useEffect(() => {
    const labelOf = (key, fallback) => labels[key] ?? fallback;
    const { nodes, pairs } = graph;
    const edgeWidth = d3.scaleLinear().domain([0, 1]).range(EDGE_WIDTH_RANGE);
    const toggleHighlight = (node) => setHighlightedKeys((keys) => toggledSet(keys, node.key));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    addText(svg, stable, { x: MARGIN.left + PLOT_WIDTH / 2, y: 30, text: labelOf("title", DEFAULT_TITLE), key: "title", className: "chart-title" });

    /** A gene name inside a box: click to highlight it in the graph. */
    const addGeneLink = (parent, node, y, text) => {
      parent.append("text")
        .attr("class", `chart-legend-label chart-gene-link ${highlightedKeys.has(node.key) ? "chart-gene-link--active" : ""}`)
        .attr("y", y)
        .text(text)
        .on("click", () => toggleHighlight(node))
        .append("title").text(`${node.id} - click to highlight`);
    };

    // ---- right column, box 1: legend (a click on a dot hides / shows that group) ----
    let nextBoxTop = placeBox(svg, MARGIN.top, (box) => {
      let y = 0;
      addText(box, stable, { x: 0, y, text: labelOf("legend", "Legend"), key: "legend", className: "chart-legend-heading" });
      groups.forEach((group) => {
        y += 24;
        const hidden = hiddenGroupIds.has(group.id);
        box.append("circle")
          .attr("class", `network__legend-dot ${hidden ? "network__legend-dot--hidden" : ""}`)
          .attr("cx", 8).attr("cy", y - 4).attr("r", 7).attr("fill", group.color)
          .on("click", () => setHiddenGroupIds((ids) => toggledSet(ids, group.id)))
          .append("title").text(hidden ? "Click to show this group" : "Click to hide this group");
        addText(box, stable, { x: 24, y, text: labelOf(`group:${group.id}`, group.name), key: `group:${group.id}`, className: `chart-legend-label ${hidden ? "chart-legend-label--hidden" : ""}` });
      });
      y += 16;
      box.append("text").attr("class", "chart-hint-label").attr("y", y).text("Click a dot to hide / show a group");
      y += 30;
      addText(box, stable, { x: 0, y, text: labelOf("edgelegend", "Line thickness = similarity"), key: "edgelegend", className: "chart-legend-category" });
      EDGE_LEGEND_SAMPLES.forEach((similarity) => {
        y += 22;
        box.append("line").attr("class", "network__edge").attr("x1", 0).attr("x2", 40).attr("y1", y - 4).attr("y2", y - 4).attr("stroke-width", edgeWidth(similarity) * 2);
        box.append("text").attr("class", "chart-tick-label").attr("x", 50).attr("y", y).text(similarity.toFixed(2));
      });
    });

    // ---- box 2: the best connected genes (a tie for 5th place is listed completely under "Show more") ----
    nextBoxTop = placeBox(svg, nextBoxTop, (box) => {
      box.append("text").attr("class", "chart-legend-category").attr("y", 0).text(`Top ${TOP_GENE_COUNT} connected genes`);
      box.append("text").attr("class", "chart-hint-label").attr("y", 15).text("sum of similarity to all other shown genes");
      const shown = showAllTop ? [...topGenes, ...tiedExtra] : topGenes;
      shown.forEach(({ node, total }, index) => {
        const y = 38 + index * BOX_LINE_HEIGHT;
        addGeneLink(box, node, y, `${index + 1}. ${truncate(node.id, 18)}`);
        box.append("text").attr("class", "chart-tick-label chart-text--end").attr("x", BOX_VALUE_X).attr("y", y).text(total.toFixed(2));
      });
      if (tiedExtra.length) {
        box.append("text").attr("class", "chart-link").attr("y", 38 + shown.length * BOX_LINE_HEIGHT + 4)
          .text(showAllTop ? "Show less" : `Show more (${tiedExtra.length} with the same sum)`)
          .on("click", () => setShowAllTop((open) => !open));
      }
    });

    // ---- box 3: genes with a perfect (1) match ----
    placeBox(svg, nextBoxTop, (box) => {
      box.append("text").attr("class", "chart-legend-category").attr("y", 0).text("Perfect matches (similarity = 1)");
      if (!perfectGenes.length) {
        wrapWords("None of the genes has a perfect (1) annotation match with others", BOX_TEXT_CHARS).forEach((line, index) => {
          box.append("text").attr("class", "chart-legend-label").attr("y", 24 + index * BOX_LINE_HEIGHT).text(line);
        });
        return;
      }
      const shown = showAllPerfect ? perfectGenes : perfectGenes.slice(0, PERFECT_LIST_PREVIEW);
      shown.forEach((node, index) => addGeneLink(box, node, 24 + index * BOX_LINE_HEIGHT, truncate(node.id, 30)));
      if (perfectGenes.length > PERFECT_LIST_PREVIEW) {
        box.append("text").attr("class", "chart-link").attr("y", 24 + shown.length * BOX_LINE_HEIGHT + 4)
          .text(showAllPerfect ? "Show less" : `Show more (${perfectGenes.length - PERFECT_LIST_PREVIEW} more)`)
          .on("click", () => setShowAllPerfect((open) => !open));
      }
    });

    // ---- the network itself ----
    svg.append("defs").append("clipPath").attr("id", "network-clip")
      .append("rect").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
    const canvas = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`).attr("clip-path", "url(#network-clip)");
    canvas.append("rect").attr("class", "network__canvas").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
    const world = canvas.append("g");

    // Lines sit behind the nodes; the strongest are drawn last so they stay on top of the weaker ones.
    const visiblePairs = pairs
      .filter((pair) => pair.similarity >= threshold && isVisible[pair.source] && isVisible[pair.target])
      .sort((a, b) => a.similarity - b.similarity);
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

    // Genes picked in the boxes get a clear ring and an arrow pointing at them. They follow the node when it is dragged.
    const visibleNodes = nodes.filter((_, index) => isVisible[index]);
    const highlightLayer = world.append("g");
    const highlightSelection = highlightLayer.selectAll("g").data(visibleNodes.filter((node) => highlightedKeys.has(node.key))).join("g")
      .attr("class", "network__highlight")
      .attr("transform", (node) => `translate(${node.screenX},${node.screenY})`);
    highlightSelection.append("circle").attr("class", "network__highlight-ring").attr("r", HIGHLIGHT_RING_RADIUS);
    highlightSelection.append("path").attr("class", "network__highlight-arrow")
      .attr("d", `M0,${-HIGHLIGHT_RING_RADIUS - 2} L-12,${-HIGHLIGHT_RING_RADIUS - 26} L12,${-HIGHLIGHT_RING_RADIUS - 26} Z`);

    // Nodes can be dragged to make room; lines and highlight follow. Dragging uses world coordinates, so it works while zoomed.
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
        highlightSelection.filter((highlighted) => highlighted === node).attr("transform", `translate(${node.screenX},${node.screenY})`);
      });
    // the circles are drawn below the highlight rings so the ring is never hidden
    world.insert("g", () => highlightLayer.node()).selectAll("circle").data(visibleNodes).join("circle")
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
  }, [
    graph, groups, threshold, labels, isVisible, hiddenGroupIds, highlightedKeys, topGenes, tiedExtra, perfectGenes,
    showAllTop, showAllPerfect, chartHeight, svgRef, zoomApi, showTooltip, hideTooltip, stable,
  ]);

  const toolbar = (
    <div className="chart-toolbar">
      <label className="chart-toolbar__label" htmlFor="network-threshold">Minimum similarity:</label>
      <input
        id="network-threshold" type="range" min="0" max="1" step="0.01"
        value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}
        className="chart-toolbar__slider"
      />
      <span className="chart-toolbar__value">{threshold.toFixed(2)}</span>
      <span className="chart-toolbar__note">{visibleEdgeCount} lines shown</span>
      <Button size="small" onClick={() => setLayoutVersion((version) => version + 1)}>Reset node positions</Button>
      <Button size="small" disabled={!highlightedKeys.size} onClick={() => setHighlightedKeys(new Set())}>Clear highlights</Button>
      <span className="chart-toolbar__note">Drag a node to move it. Click a gene name in a box to highlight it.</span>
    </div>
  );

  const hint = "Scroll to move the graph up/down, drag the background to pan, Ctrl + scroll (or + / -) to zoom. Click any text to rename it.";
  return <ChartView tools={tools} width={CHART_WIDTH} height={chartHeight} toolbar={toolbar} hint={hint} />;
}
