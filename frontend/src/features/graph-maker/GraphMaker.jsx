import React, { useRef, useState } from "react";
import CollapsibleCard from "../../components/CollapsibleCard.jsx";
import Button from "../../components/Button.jsx";
import GraphEditor from "./editor/GraphEditor.jsx";
import BarPlot from "./charts/BarPlot.jsx";
import Heatmap from "./charts/Heatmap.jsx";
import NetworkPlot from "./charts/NetworkPlot.jsx";
import { GRAPH_TYPES, INFO_TEXT } from "./graphTypes.js";
import { parseXlsx } from "./data/xlsxImport.js";
import { DEFAULT_MEASURE_KEY } from "./data/measures.js";

/**
 * The Graph maker card. Screens:
 *   "choose" (pick a graph, an info box opens on top) -> "editor" -> "graph"
 * The editor stays mounted (hidden) while a graph is shown, so "Customize" returns to it with the data intact.
 */
export default function GraphMaker() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [screen, setScreen] = useState("choose");
  const [plotType, setPlotType] = useState(null);
  const [infoBoxOpen, setInfoBoxOpen] = useState(false);
  const [generated, setGenerated] = useState({ categories: [], valueLabel: "" }); // what the graph is drawn from
  const [heatmapMeasureKey, setHeatmapMeasureKey] = useState(DEFAULT_MEASURE_KEY);
  const [editorSeed, setEditorSeed] = useState(null); // categories (with pasted text) the editor starts from
  const [editorVersion, setEditorVersion] = useState(0); // changing it restarts the editor
  const [importError, setImportError] = useState("");
  const xlsxInputRef = useRef(null);

  const currentType = GRAPH_TYPES.find((type) => type.id === plotType);
  const restartEditor = (seed) => {
    setEditorSeed(seed);
    setEditorVersion((version) => version + 1);
  };

  // ---- choosing a graph ----
  const selectGraphType = (typeId) => {
    setPlotType(typeId);
    setInfoBoxOpen(true);
    setHeatmapMeasureKey(DEFAULT_MEASURE_KEY);
    setImportError("");
    restartEditor(null);
  };

  const closeInfoBox = () => {
    setInfoBoxOpen(false);
    setPlotType(null);
    setImportError("");
  };

  const openEditor = () => {
    setInfoBoxOpen(false);
    setScreen("editor");
  };

  const leaveEditor = () => {
    setScreen("choose");
    setPlotType(null);
    restartEditor(null);
  };

  // ---- showing the graph ----
  const showGraph = (result) => {
    setGenerated(result);
    setScreen("graph");
  };

  /** "Customize" goes back to the editor with the pasted data of every group still in place. */
  const customizeGraph = () => {
    restartEditor(generated.categories.map((category) => ({
      id: category.id,
      name: category.name,
      groups: category.groups.map(({ id, name, color, text }) => ({ id, name, color, text })),
    })));
    setScreen("editor");
  };

  const importXlsx = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const result = await parseXlsx(file);
      setImportError("");
      setInfoBoxOpen(false);
      showGraph(result);
    } catch (error) {
      setImportError(error.message || "Could not read that file.");
    }
  };

  const customizeButton = screen === "graph" && (
    <Button size="small" onClick={customizeGraph}>+ Customize</Button>
  );

  return (
    <CollapsibleCard
      className="graph-maker"
      title="Graph maker"
      description="Create a graph using your data."
      expanded={isExpanded}
      onToggle={() => setIsExpanded((expanded) => !expanded)}
      headerActions={customizeButton}
    >
      <div className="graph-maker__body">
        {screen === "choose" && (
          <>
            <p className="graph-maker__prompt">Choose what kind of graph you would like to create.</p>
            <div className="graph-options">
              {GRAPH_TYPES.map(({ id, label, Icon }) => (
                <div key={id} className="graph-options__row">
                  <button
                    type="button" onClick={() => selectGraphType(id)}
                    className={`graph-option graph-option--${id} ${plotType === id ? "graph-option--selected" : ""}`}
                  >
                    <span className="graph-option__bullet">•</span> {label}
                  </button>
                  <Icon />
                </div>
              ))}
            </div>

            {infoBoxOpen && currentType && (
              <div className="info-box">
                <h3 className="info-box__title">{currentType.infoTitle}</h3>
                <div className="info-box__text">
                  {INFO_TEXT[plotType].map(([heading, body]) => (
                    <p key={heading}><strong>{heading}</strong>{body}</p>
                  ))}
                </div>
                {importError && <p className="info-box__error">{importError}</p>}
                <div className="info-box__buttons">
                  {plotType === "bar" && <Button onClick={() => xlsxInputRef.current?.click()}>Import .xlsx</Button>}
                  <Button onClick={openEditor}>Open editor</Button>
                  <Button onClick={closeInfoBox}>Close</Button>
                  <input ref={xlsxInputRef} type="file" accept=".xlsx" className="graph-maker__file-input" onChange={importXlsx} />
                </div>
              </div>
            )}
          </>
        )}

        {plotType && screen !== "choose" && (
          <div className={screen === "editor" ? "" : "graph-maker__hidden"}>
            <GraphEditor
              key={`${plotType}-${editorVersion}`} plotType={plotType} seedCategories={editorSeed}
              measureKey={heatmapMeasureKey} onMeasureChange={setHeatmapMeasureKey}
              onGenerate={showGraph} onExit={leaveEditor}
            />
          </div>
        )}

        {screen === "graph" && plotType && (
          <div className="graph-view">
            {plotType === "bar" && <BarPlot categories={generated.categories} valueLabel={generated.valueLabel} />}
            {plotType === "heatmap" && (
              <Heatmap categories={generated.categories} measureKey={heatmapMeasureKey} onMeasureChange={setHeatmapMeasureKey} />
            )}
            {plotType === "network" && <NetworkPlot groups={generated.categories[0].groups} />}
            <div className="graph-view__footer">
              <Button onClick={leaveEditor}>New graph</Button>
              <Button onClick={() => setIsExpanded(false)}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
