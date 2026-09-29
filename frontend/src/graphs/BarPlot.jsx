import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { ChartView, FONT, addText, useChartTools } from "./ChartTools.jsx";

const W = 980, H = 590;
const M = { t: 56, r: 210, b: 120, l: 70 };
const TITLE = "Gene graph (click to rename)";

/** categories: [{id, name, groups: [{id, name, color, genes: [{id, score, description}]}]}] */
export default function BarPlot({ categories }) {
  const tools = useChartTools();
  const { svgRef, zoomApi, labels, showTip, hideTip, stable } = tools;
  const trRef = useRef(d3.zoomIdentity);

  useEffect(() => {
    const L = (k, d) => labels[k] ?? d;
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("font-family", FONT);

    // Layout in "bar units": every bar is 1 unit, clusters are separated by a 2 unit gap.
    let pos = 0;
    const clusters = [];
    categories.forEach((cat) => {
      const bars = cat.groups.flatMap((g) => g.genes.map((ge) => ({ ...ge, group: g, cat })));
      if (!bars.length) return;
      if (clusters.length) pos += 2;
      const start = pos;
      bars.forEach((b) => { b.u = pos++; });
      clusters.push({ cat, bars, start, end: pos });
    });
    const total = Math.max(pos, 1);
    const scores = clusters.flatMap((c) => c.bars.map((b) => b.score));
    const y0 = d3.scaleLinear()
      .domain([Math.min(0, d3.min(scores) ?? 0), Math.max(d3.max(scores) ?? 1, 0.01) * 1.05])
      .range([ih, 0]).nice();

    // ---- static parts: title, axis titles, legend ----
    addText(svg, stable, { x: M.l + iw / 2, y: 30, text: L("title", TITLE), key: "title", anchor: "middle", size: 20, weight: "bold" });
    addText(svg, stable, { x: M.l + iw / 2, y: H - 10, text: L("xlabel", "Genes"), key: "xlabel", anchor: "middle", size: 13, weight: "bold" });
    addText(svg, stable, { x: 18, y: M.t + ih / 2, text: L("ylabel", "Similarity score"), key: "ylabel", anchor: "middle", size: 13, weight: "bold", rotate: -90 });

    let ly = M.t + 8;
    const lx = W - M.r + 24;
    addText(svg, stable, { x: lx, y: ly, text: L("legend", "Legend"), key: "legend", size: 13, weight: "bold" });
    ly += 8;
    clusters.forEach((c) => {
      ly += 22;
      addText(svg, stable, { x: lx, y: ly, text: L(`cat:${c.cat.id}`, c.cat.name), key: `cat:${c.cat.id}`, size: 12, weight: "bold" });
      c.cat.groups.forEach((g) => {
        ly += 20;
        svg.append("rect").attr("x", lx + 4).attr("y", ly - 11).attr("width", 12).attr("height", 12).attr("fill", g.color);
        addText(svg, stable, { x: lx + 24, y: ly, text: L(`group:${g.id}`, g.name), key: `group:${g.id}`, size: 12 });
      });
    });

    svg.append("defs").append("clipPath").attr("id", "bar-clip")
      .append("rect").attr("width", iw).attr("height", ih);

    // ---- zoomable part ----
    const root = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    root.append("rect").attr("width", iw).attr("height", ih).attr("fill", "transparent");
    const content = root.append("g");

    const render = (tr) => {
      hideTip();
      content.selectAll("*").remove();
      const unit = (iw / total) * tr.k;
      const X = (u) => tr.applyX((u / total) * iw);
      const yz = tr.rescaleY(y0);

      const grid = content.append("g");
      yz.ticks(6).filter((t) => yz(t) >= 0 && yz(t) <= ih).forEach((t) => {
        grid.append("line").attr("x1", 0).attr("x2", iw).attr("y1", yz(t)).attr("y2", yz(t)).attr("stroke", "#e5e5e5");
        grid.append("text").attr("x", -8).attr("y", yz(t) + 4).attr("text-anchor", "end").attr("font-size", 11).attr("fill", "#333").text(d3.format("~g")(t));
      });

      const plot = content.append("g").attr("clip-path", "url(#bar-clip)");
      const base = yz(0);
      clusters.forEach((c) => {
        c.bars.forEach((b) => {
          const x = X(b.u);
          if (x + unit < 0 || x > iw) return;
          const yv = yz(b.score);
          plot.append("rect")
            .attr("x", x + unit * 0.1).attr("width", Math.max(unit * 0.8, 0.5))
            .attr("y", Math.min(yv, base)).attr("height", Math.abs(base - yv))
            .attr("fill", b.group.color)
            .on("mousemove", (e) => showTip(e, [
              b.id,
              `Similarity score: ${Number(b.score).toFixed(3)}`,
              `${L(`cat:${c.cat.id}`, c.cat.name)} / ${L(`group:${b.group.id}`, b.group.name)}`,
              b.description || "(no description)",
            ]))
            .on("mouseleave", hideTip);
        });
      });

      // baseline + left axis
      if (base >= 0 && base <= ih) content.append("line").attr("x1", 0).attr("x2", iw).attr("y1", base).attr("y2", base).attr("stroke", "#111");
      content.append("line").attr("y1", 0).attr("y2", ih).attr("stroke", "#111");
      content.append("line").attr("x1", 0).attr("x2", iw).attr("y1", ih).attr("y2", ih).attr("stroke", "#111");

      // gene labels when there is room, cluster labels always
      if (unit >= 11) {
        clusters.forEach((c) => c.bars.forEach((b) => {
          const x = X(b.u) + unit / 2;
          if (x < 0 || x > iw) return;
          content.append("text").attr("font-size", 10).attr("fill", "#333")
            .attr("x", x).attr("y", ih + 10)
            .attr("transform", `rotate(45 ${x} ${ih + 10})`).text(b.id);
        }));
      }
      const labelY = ih + 100;
      clusters.forEach((c) => {
        const x1 = Math.max(X(c.start), 0), x2 = Math.min(X(c.end), iw);
        if (x2 <= x1) return;
        content.append("line").attr("x1", x1).attr("x2", x2).attr("y1", labelY - 16).attr("y2", labelY - 16).attr("stroke", "#111").attr("stroke-width", 2);
        addText(content, stable, { x: (x1 + x2) / 2, y: labelY, text: L(`cat:${c.cat.id}`, c.cat.name), key: `cat:${c.cat.id}`, anchor: "middle", size: 13, weight: "bold" });
      });
    };

    const zoom = d3.zoom().scaleExtent([1, 80])
      .extent([[0, 0], [iw, ih]]).translateExtent([[0, 0], [iw, ih]])
      .on("zoom", (e) => { trRef.current = e.transform; render(e.transform); });
    root.call(zoom).on("dblclick.zoom", null);
    zoomApi.current = { reset: () => root.transition().duration(300).call(zoom.transform, d3.zoomIdentity) };
    root.call(zoom.transform, trRef.current);

    return () => root.on(".zoom", null);
  }, [categories, labels, svgRef, zoomApi, showTip, hideTip, stable]);

  return <ChartView tools={tools} width={W} height={H} />;
}
