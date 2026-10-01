// Mouse and wheel behaviour shared by the zoomable charts.

/**
 * Ctrl/Cmd + wheel (or a trackpad pinch) zooms; plain wheel is left alone so it can scroll the page
 * (or pan, see enableWheelPan). Dragging pans. Used as the `filter` of d3.zoom().
 */
export function zoomFilter(event) {
  if (event.type === "wheel") return event.ctrlKey || event.metaKey;
  return !event.button;
}

/** One Ctrl+wheel notch zooms by about 1.6x; d3's default is far too strong for a mouse wheel. */
export function zoomWheelDelta(event) {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  const delta = -event.deltaY * unit * (event.ctrlKey ? 3 : 1);
  return Math.max(-0.5, Math.min(0.5, delta));
}

/**
 * Plain mouse wheel pans the chart up/down (shift or a sideways wheel pans left/right),
 * so the user can "scroll inside" the graph. Ctrl/Cmd + wheel is left to d3's zoom.
 * `getScale` returns the current zoom factor so panning feels the same at any zoom level.
 */
export function enableWheelPan(selection, zoomBehavior, getScale) {
  selection.on("wheel.pan", (event) => {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const scale = getScale();
    selection.call(zoomBehavior.translateBy, -event.deltaX / scale, -event.deltaY / scale);
  }, { passive: false });
}

/** Remove the listeners added by d3.zoom and enableWheelPan. */
export function disableZoom(selection) {
  selection.on(".zoom", null).on(".pan", null);
}
