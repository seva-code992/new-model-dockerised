import React from "react";

// Icons shown next to the three graph choices (shapes follow the Figma design).

const HEATMAP_TONES = [
  ["red", "yellow", "cyan", "gold"],
  ["orange", "red", "gold", "cyan"],
  ["yellow", "cyan", "red", "blue"],
  ["indigo", "yellow", "gold", "red"],
];
const HEATMAP_CELL_SIZE = 15;

const BAR_HEIGHTS = [40, 24, 51, 34];

export function BarPlotIcon() {
  return (
    <svg className="graph-icon" width="104" height="71" viewBox="0 0 104 71" aria-hidden="true">
      <line className="graph-icon__line" x1="1" y1="0" x2="1" y2="70" />
      <line className="graph-icon__line" x1="1" y1="70" x2="104" y2="70" />
      {BAR_HEIGHTS.map((height, index) => (
        <rect key={index} className="graph-icon__bar" x={20 + index * 15} y={70 - height} width="9" height={height} />
      ))}
    </svg>
  );
}

export function HeatmapIcon() {
  return (
    <svg className="graph-icon" width="61" height="61" viewBox="0 0 61 61" aria-hidden="true">
      {HEATMAP_TONES.flatMap((row, rowIndex) =>
        row.map((tone, columnIndex) => (
          <rect
            key={`${rowIndex}-${columnIndex}`} className="graph-icon__heat-cell" data-tone={tone}
            x={columnIndex * HEATMAP_CELL_SIZE} y={rowIndex * HEATMAP_CELL_SIZE}
            width={HEATMAP_CELL_SIZE} height={HEATMAP_CELL_SIZE}
          />
        )))}
    </svg>
  );
}

const NETWORK_NODES = [[10, 10], [60, 28], [22, 61], [64, 66]];
const NETWORK_LINKS = [[0, 1, 1], [0, 2, 2], [2, 1, 1.5], [0, 3, 1]]; // [from, to, line width]

export function NetworkIcon() {
  return (
    <svg className="graph-icon" width="79" height="82" viewBox="0 0 79 82" aria-hidden="true">
      {NETWORK_LINKS.map(([from, to, width], index) => (
        <line
          key={index} className="graph-icon__line" strokeWidth={width}
          x1={NETWORK_NODES[from][0]} y1={NETWORK_NODES[from][1]} x2={NETWORK_NODES[to][0]} y2={NETWORK_NODES[to][1]}
        />
      ))}
      {NETWORK_NODES.map(([x, y], index) => (
        <circle key={index} className="graph-icon__node" cx={x} cy={y} r="10" />
      ))}
    </svg>
  );
}
