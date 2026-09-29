import React, { useRef, useState } from "react";
import BarPlot from "./graphs/BarPlot.jsx";
import Heatmap from "./graphs/Heatmap.jsx";
import NetworkPlot from "./graphs/NetworkPlot.jsx";
import GraphEditor from "./graphs/GraphEditor.jsx";
import { parseXlsx } from "./graphs/chartUtils.js";

const OPTIONS = [
  { id: "bar", label: "Create a bar plot" },
  { id: "heatmap", label: "Create a heatmap" },
  { id: "network", label: "Create a network plot" },
];

const btn = "bg-[#D9D9D9] hover:bg-gray-300 border border-gray-400 text-black px-4 py-1.5 text-sm shadow-sm";

export default function GraphMaker() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [type, setType] = useState(null);
  const [mode, setMode] = useState("options"); // options | editor | graph
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false); // editor stays mounted (hidden) while a graph is shown
  const [source, setSource] = useState("editor"); // where the current graph's data came from
  const fileRef = useRef(null);

  const choose = (id) => {
    setType(id);
    setMode(id === "bar" ? "options" : "editor");
    setEditorOpen(id !== "bar");
    setSource("editor");
    setError("");
  };

  const importXlsx = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setCategories(await parseXlsx(file));
      setError("");
      setSource("xlsx");
      setMode("graph");
    } catch (err) {
      setError(err.message || "Could not read that file.");
    }
  };

  const generate = (cats) => {
    setCategories(cats);
    setMode("graph");
  };

  return (
    <div className="w-full bg-white border-4 border-[#CCCCCC] p-6 shadow-lg relative transition-all">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-black">Graph maker</h2>
          {!isExpanded && (
            <p className="text-gray-500 font-medium text-sm mt-2">Create a graph using your data.</p>
          )}
        </div>
        <button
          onClick={() => setIsExpanded((p) => !p)}
          className="text-[#0004FF] focus:outline-none"
          aria-label="Toggle Expand"
        >
          <svg viewBox="0 0 22 18" className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? "" : "rotate-180"}`}>
            <path d="M2 2 L11 15 L20 2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-wrap gap-3">
            {OPTIONS.map((o) => (
              <button
                key={o.id} type="button" onClick={() => choose(o.id)}
                className={`border px-4 py-2 text-sm text-black shadow-sm ${type === o.id ? "bg-[#62D0F6] border-black" : "bg-[#D9D9D9] border-gray-400 hover:bg-gray-300"}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {type === "bar" && mode === "options" && (
            <div className="border border-gray-300 bg-[#F9F9F9] p-4 flex flex-col gap-3 text-sm text-black">
              <div>
                <p className="font-bold">Data selection options:</p>
                <p>The currently supported formats are .xlsx or our custom-made editor.</p>
              </div>
              <p>
                <b>Important information for .xlsx documents:</b> the first row must be headers, the first column
                must be qualitative values (gene IDs or labels) and the second column must be quantitative values
                (similarity scores). Optional: a third column with a group name and a fourth column with a description.
              </p>
              <p>
                <b>Important information for the editor:</b> only data from the Semantic search feature is supported.
              </p>
              <div className="flex gap-3">
                <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Import .xlsx</button>
                <button type="button" className={btn} onClick={() => { setEditorOpen(true); setMode("editor"); }}>Open editor</button>
                <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={importXlsx} />
              </div>
              {error && <p className="text-red-600">{error}</p>}
            </div>
          )}

          {editorOpen && type && (
            <div className={mode === "editor" ? "" : "hidden"}>
              <GraphEditor
                key={type} type={type} onGenerate={(cats) => { setSource("editor"); generate(cats); }}
                onBack={() => {
                  setMode("options");
                  if (type !== "bar") { setType(null); setEditorOpen(false); }
                }}
              />
            </div>
          )}

          {mode === "graph" && type && (
            <div className="flex flex-col gap-3">
              <div>
                <button type="button" className={btn} onClick={() => setMode(source === "xlsx" ? "options" : "editor")}>
                  ← Back
                </button>
              </div>
              {type === "bar" && <BarPlot categories={categories} />}
              {type === "heatmap" && <Heatmap categories={categories} />}
              {type === "network" && <NetworkPlot categories={categories} />}
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={() => setIsExpanded(false)} className={btn}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
