import React, { useEffect } from "react";
import * as d3 from "d3";
import { ChartView, FONT, addText, useChartTools } from "./ChartTools.jsx";
import { jaccard } from "./chartUtils.js";

const W = 980, H = 640;
const M = { t: 56, r: 190, b: 130, l: 150 };
const TITLE = "Gene graph (click to rename)";

/** category: {id, name, groups: [{id, name, genes: [{id}]}]}. Cells hold the Jaccard index of gene IDs. */
export default function Heatmap({ categories }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTip, hideTip, stable } = tools;
  const groups = categories[0]?.groups ?? [];

  useEffect(() => {
    const L = (k, d) => labels[k] ?? d;
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const size = Math.min(iw, ih);
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("font-family", FONT);
    zoomApi.current = null;

    const name = (g) => L(`group:${g.id}`, g.name);
    const scale = d3.scaleBand().domain(groups.map((g) => g.id)).range([0, size]).padding(0.04);
    const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 1]);

    addText(svg, stable, { x: M.l + size / 2, y: 30, text: L("title", TITLE), key: "title", anchor: "middle", size: 20, weight: "bold" });
    addText(svg, stable, { x: M.l + size / 2, y: M.t + size + 110, text: L("xlabel", "Groups"), key: "xlabel", anchor: "middle", size: 13, weight: "bold" });
    addText(svg, stable, { x: 18, y: M.t + size / 2, text: L("ylabel", "Groups"), key: "ylabel", anchor: "middle", size: 13, weight: "bold", rotate: -90 });

    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    groups.forEach((row) => {
      groups.forEach((col) => {
        const j = jaccard(row.genes.map((x) => x.id), col.genes.map((x) => x.id));
        const x = scale(col.id), y = scale(row.id);
        g.append("rect").attr("x", x).attr("y", y).attr("width", scale.bandwidth()).attr("height", scale.bandwidth())
          .attr("fill", color(j.value))
          .on("mousemove", (e) => showTip(e, [
            `${name(row)} vs ${name(col)}`,
            `Jaccard index: ${j.value.toFixed(4)}`,
            `Common genes: ${j.inter} / ${j.union} in union`,
          ]))
          .on("mouseleave", hideTip);
        if (scale.bandwidth() > 34) {
          g.append("text").attr("x", x + scale.bandwidth() / 2).attr("y", y + scale.bandwidth() / 2 + 4)
            .attr("text-anchor", "middle").attr("font-size", 12).style("pointer-events", "none")
            .attr("fill", j.value > 0.55 ? "#fff" : "#111").text(j.value.toFixed(2));
        }
      });
    });
    groups.forEach((gr) => {
      addText(g, stable, { x: -8, y: scale(gr.id) + scale.bandwidth() / 2 + 4, text: name(gr), key: `group:${gr.id}`, anchor: "end", size: 12 });
      const cx = scale(gr.id) + scale.bandwidth() / 2;
      addText(g, stable, { x: cx, y: size + 14, text: name(gr), key: `group:${gr.id}`, size: 12, rotate: 40 });
    });

    // colour legend
    const lx = W - M.r + 40;
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "heat-grad").attr("x1", 0).attr("x2", 0).attr("y1", 1).attr("y2", 0);
    d3.range(0, 1.01, 0.1).forEach((t) => grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", color(t)));
    addText(svg, stable, { x: lx, y: M.t - 10, text: L("legend", "Jaccard index"), key: "legend", size: 13, weight: "bold" });
    svg.append("rect").attr("x", lx).attr("y", M.t).attr("width", 18).attr("height", 200).attr("fill", "url(#heat-grad)").attr("stroke", "#111");
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      svg.append("text").attr("x", lx + 26).attr("y", M.t + 200 - t * 200 + 4).attr("font-size", 11).text(t.toFixed(2));
    });
  }, [groups, labels, svgRef, zoomApi, showTip, hideTip, stable]);

  return <ChartView tools={tools} width={W} height={H} />;
}
