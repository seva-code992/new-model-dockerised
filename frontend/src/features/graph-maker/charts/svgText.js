// Small d3 helpers for the text and legend frames inside the SVG charts. Styling is in styles/charts.css.

/** Append an SVG text element that opens the rename box when clicked. */
export function addText(parent, tools, { x, y, text, key, className = "", rotate }) {
  const textElement = parent
    .append("text")
    .attr("class", `chart-text chart-text--renamable ${className}`)
    .attr("x", x)
    .attr("y", y)
    .text(text)
    .on("click", (event) => tools.startRename(key, event.currentTarget, text));
  if (rotate) textElement.attr("transform", `rotate(${rotate} ${x} ${y})`);
  textElement.append("title").text("Click to rename");
  return textElement;
}

/** Draw a framed box behind an already-filled group (legend and information boxes). */
export function frameBox(group, padding = 10) {
  const box = group.node().getBBox();
  group
    .insert("rect", ":first-child")
    .attr("class", "chart-legend-frame")
    .attr("x", box.x - padding)
    .attr("y", box.y - padding)
    .attr("width", box.width + padding * 2)
    .attr("height", box.height + padding * 2);
}

/** Split a sentence into lines of at most maxChars characters (SVG text does not wrap by itself). */
export function wrapWords(sentence, maxChars) {
  const lines = [];
  let line = "";
  sentence.split(" ").forEach((word) => {
    if (line && `${line} ${word}`.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/** Shorten long gene IDs so they fit inside a box. */
export const truncate = (text, maxChars) => (text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text);
