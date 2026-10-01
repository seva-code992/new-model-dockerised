import { useCallback, useMemo, useRef, useState } from "react";

/**
 * State every chart shares: the hover tooltip, the pinned details panel, the rename box and the label overrides.
 * `stable` only holds functions whose identity never changes, so d3 effects can depend on it
 * without redrawing the chart on every hover.
 */
export function useChartTools() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const zoomApi = useRef(null); // set by a chart: { reset, zoomIn, zoomOut }
  const [tooltip, setTooltip] = useState(null);
  const [pinned, setPinned] = useState(null); // details kept open after a click: { x, y, content }
  const pinnedRef = useRef(null);
  pinnedRef.current = pinned;
  const [renameBox, setRenameBox] = useState(null);
  const [labels, setLabels] = useState({});
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  const showTooltip = useCallback((event, lines) => {
    if (pinnedRef.current) return; // hovering stays quiet while details are pinned
    const containerRect = containerRef.current.getBoundingClientRect();
    setTooltip({ x: event.clientX - containerRect.left + 14, y: event.clientY - containerRect.top + 14, lines });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  /**
   * Keep the details of a clicked shape open so they can be read at leisure.
   * content: { heading, rows: [[label, text]], lists: [{ title, items: [text] }] }
   */
  const pinPanel = useCallback((event, content) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    setTooltip(null);
    setPinned({ x: event.clientX - containerRect.left, y: event.clientY - containerRect.top, content });
  }, []);
  const unpinPanel = useCallback(() => setPinned(null), []);

  const startRename = useCallback((key, element, value) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const textRect = element.getBoundingClientRect();
    setTooltip(null);
    // A label that still shows its default text opens empty (the default stays visible as a hint),
    // so the user can just type. An already renamed label opens with its text to edit.
    const isDefault = labelsRef.current[key] === undefined;
    setRenameBox({
      key,
      value: isDefault ? "" : value,
      placeholder: value,
      x: textRect.left - containerRect.left,
      y: textRect.top - containerRect.top,
      width: Math.max(textRect.width + 24, 140),
      height: Math.max(textRect.height, 24),
    });
  }, []);

  const stable = useMemo(() => ({ startRename }), [startRename]);

  return {
    stable, containerRef, svgRef, zoomApi,
    tooltip, pinned, renameBox, setRenameBox, labels, setLabels,
    showTooltip, hideTooltip, pinPanel, unpinPanel,
  };
}
