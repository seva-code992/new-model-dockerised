import React, { useMemo } from "react";
import { parsePastedData } from "./editorModel.js";
import { TABLE_KIND } from "../data/tableParsing.js";

/** One line under a paste box: how many genes were read, or what is wrong with the pasted text. */
export default function DataSummary({ plotType, text }) {
  const parsed = useMemo(() => parsePastedData(plotType, text), [plotType, text]);
  if (!text.trim()) return null;
  if (parsed.error) return <p className="editor__message editor__message--error">{parsed.error}</p>;

  const details = [];
  if (parsed.query) details.push(`query: ${parsed.query}`);
  if (parsed.species) details.push(parsed.species);
  if (plotType === "bar") {
    if (parsed.kind === TABLE_KIND.SEMANTIC) details.push("Y axis: similarity score");
    if (parsed.kind === TABLE_KIND.ANNOTATION) {
      details.push("Y axis: length");
      const missing = parsed.genes.filter((gene) => gene.length === null).length;
      if (missing) details.push(`${missing} without a length will be left out`);
    }
  }
  return <p className="editor__message">{parsed.genes.length} genes{details.length ? ` · ${details.join(" · ")}` : ""}</p>;
}
