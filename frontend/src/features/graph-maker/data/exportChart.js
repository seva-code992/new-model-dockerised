// Saving a chart as SVG or PNG. Styling lives in the stylesheets, so the computed values
// are written into the exported file to make it look the same outside the page.

const EXPORTED_STYLE_PROPERTIES = [
  "fill", "stroke", "stroke-width", "stroke-dasharray", "opacity",
  "font-family", "font-size", "font-weight", "letter-spacing", "text-anchor", "text-decoration",
];

function inlineComputedStyles(liveSvg, clonedSvg) {
  const clonedNodes = clonedSvg.querySelectorAll("*");
  liveSvg.querySelectorAll("*").forEach((liveNode, index) => {
    const computed = getComputedStyle(liveNode);
    EXPORTED_STYLE_PROPERTIES.forEach((property) => {
      clonedNodes[index].style.setProperty(property, computed.getPropertyValue(property));
    });
  });
}

function serialize(svg) {
  const clone = svg.cloneNode(true);
  inlineComputedStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBox = svg.viewBox.baseVal;
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("width", viewBox.width);
  background.setAttribute("height", viewBox.height);
  background.style.setProperty("fill", "#ffffff");
  clone.insertBefore(background, clone.firstChild);
  clone.setAttribute("width", viewBox.width);
  clone.setAttribute("height", viewBox.height);
  return { xml: new XMLSerializer().serializeToString(clone), width: viewBox.width, height: viewBox.height };
}

function saveBlob(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export function downloadSvg(svg, fileName = "gene-graph.svg") {
  saveBlob(new Blob([serialize(svg).xml], { type: "image/svg+xml" }), fileName);
}

export function downloadPng(svg, fileName = "gene-graph.png") {
  const { xml, width, height } = serialize(svg);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.drawImage(image, 0, 0, width, height);
    canvas.toBlob((blob) => saveBlob(blob, fileName), "image/png");
  };
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
