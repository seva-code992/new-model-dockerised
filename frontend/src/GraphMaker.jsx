import React, { useRef, useState } from "react";
import BarPlot from "./graphs/BarPlot.jsx";
import Heatmap from "./graphs/Heatmap.jsx";
import NetworkPlot from "./graphs/NetworkPlot.jsx";
import GraphEditor from "./graphs/GraphEditor.jsx";
import { BarPlotIcon, HeatmapIcon, NetworkIcon } from "./graphs/GraphIcons.jsx";
import { genesToTable, parseXlsx } from "./graphs/chartUtils.js";

const GRAPH_TYPES = [
  { id: "bar", label: "Bar plot", infoTitle: "Create a bar plot", Icon: BarPlotIcon },
  { id: "heatmap", label: "Heatmap", infoTitle: "Create a heatmap", Icon: HeatmapIcon },
  { id: "network", label: "Network graph", infoTitle: "Create a network graph", Icon: NetworkIcon },
];

// What the user needs to know before importing data, per graph type.
const INFO_TEXT = {
  bar: [
    ["Data selection options: ", "The currently supported formats are .xlsx or our custom-made editor."],
    ["Important information for .xlsx documents: ", "the first row must be headers, the first column must be qualitative values (gene IDs or labels) and the second column must be quantitative values (similarity scores). Optional: a third column with a group name and a fourth column with a description."],
    ["Important information for the editor: ", "data from the above search features should be pasted as tables (choose “Copy table” from the Semantic search above)."],
  ],
  heatmap: [
    ["Data selection options: ", "The currently supported format is our custom-made editor."],
    ["Important information for the editor: ", "data from the above search features should be pasted as tables (choose “Copy table” from the Semantic search above). Add two or more groups; the heatmap compares their gene IDs."],
  ],
  network: [
    ["Data selection options: ", "The currently supported format is our custom-made editor."],
    ["Important information for the editor: ", "data from the Semantic search feature should be pasted in JSON format (choose “Copy in JSON format” from above). Every pasted JSON becomes one coloured group of genes."],
  ],
};

/** Put a generated group back into the text form the editor understands. */
function groupToEditorText(plotType, group) {
  if (plotType !== "network") return genesToTable(group.genes);
  const genes = group.genes.map((gene) => ({ id: gene.id, description: gene.description, similarity: gene.score, embedding: gene.embedding }));
  return JSON.stringify({ genes }, null, 2);
}

// Screens: "choose" (pick a graph) -> info box -> "editor" -> "graph"
export default function GraphMaker() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [screen, setScreen] = useState("choose");
  const [plotType, setPlotType] = useState(null);
  const [infoBoxOpen, setInfoBoxOpen] = useState(false);
  const [generatedCategories, setGeneratedCategories] = useState([]);
  const [editorSeed, setEditorSeed] = useState(null); // categories (with pasted text) the editor starts from
  const [editorVersion, setEditorVersion] = useState(0); // changing it restarts the editor
  const [importError, setImportError] = useState("");
  const xlsxInputRef = useRef(null);

  const selectGraphType = (typeId) => {
    setPlotType(typeId);
    setInfoBoxOpen(true);
    setEditorSeed(null);
    setEditorVersion((version) => version + 1);
    setImportError("");
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
    setEditorSeed(null);
  };

  const showGraph = (categories) => {
    setGeneratedCategories(categories);
    setScreen("graph");
  };

  // "Customize" goes back to the editor with the data already filled in.
  const customizeGraph = () => {
    setEditorSeed(generatedCategories.map((category) => ({
      ...category,
      groups: category.groups.map((group) => ({ id: group.id, name: group.name, color: group.color, text: groupToEditorText(plotType, group) })),
    })));
    setEditorVersion((version) => version + 1);
    setScreen("editor");
  };

  const importXlsx = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const categories = await parseXlsx(file);
      setImportError("");
      setInfoBoxOpen(false);
      showGraph(categories);
    } catch (error) {
      setImportError(error.message || "Could not read that file.");
    }
  };

  const toggleExpanded = () => setIsExpanded((expanded) => !expanded);
  const currentType = GRAPH_TYPES.find((type) => type.id === plotType);

  return (
    <section className="graph-maker">
      <div className="graph-maker__panel">
        <header className="graph-maker__header">
          <div>
            <h2 className="graph-maker__title">Graph maker</h2>
            {!isExpanded && <p className="graph-maker__description">Create a graph using your data.</p>}
          </div>
          <div className="graph-maker__header-actions">
            {isExpanded && screen === "graph" && (
              <button type="button" className="gm-button gm-button--small gm-button--customize" onClick={customizeGraph}>
                + Customize
              </button>
            )}
            <button type="button" className="graph-maker__chevron-button" onClick={toggleExpanded} aria-label="Toggle Expand">
              <svg viewBox="0 0 22 18" className={`graph-maker__chevron ${isExpanded ? "" : "graph-maker__chevron--collapsed"}`}>
                <path d="M2 2 L11 15 L20 2" />
              </svg>
            </button>
          </div>
        </header>

        {isExpanded && (
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
                      {plotType === "bar" && (
                        <button type="button" className="gm-button" onClick={() => xlsxInputRef.current?.click()}>Import .xlsx</button>
                      )}
                      <button type="button" className="gm-button" onClick={openEditor}>Open editor</button>
                      <button type="button" className="gm-button" onClick={closeInfoBox}>Close</button>
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
                  onGenerate={showGraph} onExit={leaveEditor}
                />
              </div>
            )}

            {screen === "graph" && plotType && (
              <div className="graph-view">
                {plotType === "bar" && <BarPlot categories={generatedCategories} />}
                {plotType === "heatmap" && <Heatmap categories={generatedCategories} />}
                {plotType === "network" && <NetworkPlot groups={generatedCategories[0].groups} />}
                <div className="graph-view__footer">
                  <button type="button" className="gm-button" onClick={leaveEditor}>New graph</button>
                  <button type="button" className="gm-button" onClick={() => setIsExpanded(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
