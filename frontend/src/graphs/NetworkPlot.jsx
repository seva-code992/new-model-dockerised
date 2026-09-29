import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ChartView, FONT, addText, useChartTools } from "./ChartTools.jsx";
import { cosine } from "./chartUtils.js";

const W = 980, H = 640;
const M = { t: 56, r: 210, b: 20, l: 20 };
const TITLE = "Gene graph (click to rename)";
const iw = W - M.l - M.r, ih = H - M.t - M.b;

/** Nodes are laid out once from the embeddings; the slider only filters which edges are shown. */
function buildGraph(categories) {
  const nodes = categories.flatMap((cat) =>
    cat.genes.map((g) => ({ ...g, cat, key: `${cat.id}:${g.id}` })));
  const sims = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      sims.push({ source: i, target: j, sim: cosine(nodes[i].embedding, nodes[j].embedding) });
    }
  }
  // Layout: pull each node towards its 3 most similar neighbours, push everything apart.
  const near = new Map();
  nodes.forEach((_, i) => {
    sims.filter((e) => e.source === i || e.target === i)
      .sort((a, b) => b.sim - a.sim).slice(0, 3)
      .forEach((e) => near.set(`${e.source}-${e.target}`, { source: e.source, target: e.target, sim: e.sim }));
  });
  const links = [...near.values()];
  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).distance((d) => 30 + (1 - d.sim) * 400).strength(0.4))
    .force("charge", d3.forceManyBody().strength(-90))
    .force("collide", d3.forceCollide(12))
    .force("center", d3.forceCenter(iw / 2, ih / 2))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();

  const xs = d3.extent(nodes, (n) => n.x), ys = d3.extent(nodes, (n) => n.y);
  const fx = d3.scaleLinear().domain(xs[0] === xs[1] ? [xs[0] - 1, xs[1] + 1] : xs).range([24, iw - 24]);
  const fy = d3.scaleLinear().domain(ys[0] === ys[1] ? [ys[0] - 1, ys[1] + 1] : ys).range([24, ih - 24]);
  nodes.forEach((n) => { n.px = fx(n.x); n.py = fy(n.y); });
  return { nodes, sims };
}

/** categories: [{id, name, color, genes: [{id, description, embedding}]}] */
export default function NetworkPlot({ categories }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTip, hideTip, stable } = tools;
  const trRef = useRef(d3.zoomIdentity);
  const [threshold, setThreshold] = useState(0.6);
  const graph = useMemo(() => buildGraph(categories), [categories]);
  const shown = useMemo(() => graph.sims.filter((e) => e.sim >= threshold).length, [graph, threshold]);

  useEffect(() => {
    const L = (k, d) => labels[k] ?? d;
    const { nodes, sims } = graph;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("font-family", FONT);

    addText(svg, stable, { x: M.l + iw / 2 + 60, y: 30, text: L("title", TITLE), key: "title", anchor: "middle", size: 20, weight: "bold" });

    const lx = W - M.r + 24;
    let ly = M.t + 8;
    addText(svg, stable, { x: lx, y: ly, text: L("legend", "Legend"), key: "legend", size: 13, weight: "bold" });
    categories.forEach((c) => {
      ly += 22;
      svg.append("circle").attr("cx", lx + 8).attr("cy", ly - 4).attr("r", 6).attr("fill", c.color).attr("stroke", "#111");
      addText(svg, stable, { x: lx + 24, y: ly, text: L(`cat:${c.id}`, c.name), key: `cat:${c.id}`, size: 12 });
    });
    ly += 34;
    addText(svg, stable, { x: lx, y: ly, text: L("edgelegend", "Line thickness = similarity"), key: "edgelegend", size: 12, weight: "bold" });
    const width = d3.scaleLinear().domain([0, 1]).range([0.4, 7]);
    [0.25, 0.5, 0.75, 1].forEach((s) => {
      ly += 20;
      svg.append("line").attr("x1", lx).attr("x2", lx + 40).attr("y1", ly - 4).attr("y2", ly - 4).attr("stroke", "#555").attr("stroke-width", width(s));
      svg.append("text").attr("x", lx + 50).attr("y", ly).attr("font-size", 11).text(s.toFixed(2));
    });

    svg.append("defs").append("clipPath").attr("id", "net-clip").append("rect").attr("width", iw).attr("height", ih);
    const root = svg.append("g").attr("transform", `translate(${M.l},${M.t})`).attr("clip-path", "url(#net-clip)");
    root.append("rect").attr("width", iw).attr("height", ih).attr("fill", "#fafafa").attr("stroke", "#ccc");
    const world = root.append("g");

    const edges = world.append("g");
    sims.filter((e) => e.sim >= threshold).sort((a, b) => a.sim - b.sim).forEach((e) => {
      const a = nodes[e.source], b = nodes[e.target];
      edges.append("line").attr("x1", a.px).attr("y1", a.py).attr("x2", b.px).attr("y2", b.py)
        .attr("stroke", "#555").attr("stroke-opacity", 0.25 + 0.6 * e.sim).attr("stroke-width", width(e.sim))
        .on("mousemove", (ev) => showTip(ev, [`${a.id} — ${b.id}`, `Similarity: ${e.sim.toFixed(3)}`]))
        .on("mouseleave", hideTip);
    });

    const dots = world.append("g");
    nodes.forEach((n) => {
      dots.append("circle").attr("cx", n.px).attr("cy", n.py).attr("r", 7)
        .attr("fill", n.cat.color).attr("stroke", "#111").attr("stroke-width", 1)
        .on("mousemove", (ev) => showTip(ev, [
          n.id,
          L(`cat:${n.cat.id}`, n.cat.name),
          n.description || "(no description)",
        ]))
        .on("mouseleave", hideTip);
    });

    const zoom = d3.zoom().scaleExtent([0.5, 40])
      .on("zoom", (e) => { trRef.current = e.transform; world.attr("transform", e.transform); });
    root.call(zoom).on("dblclick.zoom", null);
    zoomApi.current = { reset: () => root.transition().duration(300).call(zoom.transform, d3.zoomIdentity) };
    root.call(zoom.transform, trRef.current);

    return () => root.on(".zoom", null);
  }, [graph, categories, threshold, labels, svgRef, zoomApi, showTip, hideTip, stable]);

  return (
    <ChartView tools={tools} width={W} height={H}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-black">
        <label className="font-bold" htmlFor="net-threshold">Minimum similarity:</label>
        <input
          id="net-threshold" type="range" min="0" max="1" step="0.01"
          value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-64"
        />
        <span className="w-10">{threshold.toFixed(2)}</span>
        <span className="text-xs text-gray-600">{shown} of {graph.sims.length} lines shown</span>
      </div>
    </ChartView>
  );
}
