import React, { useState } from "react";
import Button from "../../../components/Button.jsx";
import ColorChooser from "../../../components/ColorChooser.jsx";
import GroupBox from "./GroupBox.jsx";
import NameInput from "./NameInput.jsx";
import DataSummary from "./DataSummary.jsx";
import { BAR_EDITOR_NOTE, GROUP_PASTE_HINT, PASTE_HINT, makeCategory, makeGroup, parsePastedData } from "./editorModel.js";
import { DEFAULT_THEME_KEY, pickThemeColor } from "../data/palettes.js";
import { HEATMAP_MEASURES } from "../data/measures.js";
import { TABLE_KIND } from "../data/tableParsing.js";
import { toBarGenes } from "../data/barData.js";

/**
 * plotType:       "bar" | "heatmap" | "network"
 * seedCategories: optional [{ id, name, groups: [{ id, name, color, text }] }] to start from
 * measureKey / onMeasureChange: what a heatmap compares (gene IDs, chromosomes, PFAMs ...)
 * onGenerate({ categories, valueLabel }) is called with the parsed data.
 *
 * Bar plot:  starts as one big paste box (+ "Customize" colour); "Add category and groups" turns it
 *            into Category1/Group1 and unlocks several categories with several groups each.
 * Heatmap and network plot: always work with groups only (a single hidden category).
 */
export default function GraphEditor({ plotType, seedCategories, measureKey, onMeasureChange, onGenerate, onExit }) {
  const groupsOnly = plotType !== "bar";
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME_KEY);
  const [isStructured, setIsStructured] = useState(groupsOnly || !!seedCategories);
  const [singleText, setSingleText] = useState("");
  const [singleColor, setSingleColor] = useState(() => pickThemeColor(DEFAULT_THEME_KEY));
  const [singleChooserOpen, setSingleChooserOpen] = useState(false);
  const [categories, setCategories] = useState(
    () => seedCategories ?? (groupsOnly ? [makeCategory([], [makeGroup({ plotType, siblingGroups: [], takenColors: [], themeKey: DEFAULT_THEME_KEY })])] : []),
  );
  const [errorMessage, setErrorMessage] = useState("");

  const colorsInUse = categories.flatMap((category) => category.groups.map((group) => group.color));
  const newGroup = (siblingGroups, text = "") => makeGroup({ plotType, siblingGroups, takenColors: colorsInUse, themeKey, text });

  // ---- changing the structure ----
  const switchToCategories = () => {
    setErrorMessage("");
    const firstGroup = { ...makeGroup({ plotType, siblingGroups: [], takenColors: [], themeKey, text: singleText }), color: singleColor };
    setCategories([makeCategory([], [firstGroup])]);
    setIsStructured(true);
  };
  const addCategory = () => setCategories([...categories, makeCategory(categories, [newGroup([])])]);
  const updateCategory = (categoryId, changes) =>
    setCategories(categories.map((category) => (category.id === categoryId ? { ...category, ...changes } : category)));
  const removeCategory = (categoryId) => setCategories(categories.filter((category) => category.id !== categoryId));
  const addGroup = (category) => updateCategory(category.id, { groups: [...category.groups, newGroup(category.groups)] });
  const updateGroup = (category, updatedGroup) =>
    updateCategory(category.id, { groups: category.groups.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)) });
  const removeGroup = (category, groupId) =>
    updateCategory(category.id, { groups: category.groups.filter((group) => group.id !== groupId) });

  // ---- turning the pasted text into graph data ----
  /** Parse one group; returns { group } with the data the chart needs, or { error }. */
  const readGroup = (group) => {
    if (!group.text.trim()) return { error: `"${group.name}" is empty. Paste data into it or remove it.` };
    const parsed = parsePastedData(plotType, group.text);
    if (parsed.error) return { error: `"${group.name}": ${parsed.error}` };

    const base = { id: group.id, name: group.name, color: group.color, text: group.text };
    if (plotType !== "bar") return { group: { ...base, genes: parsed.genes } };

    const bar = toBarGenes(parsed);
    if (bar.error) return { error: `"${group.name}": ${bar.error}` };
    if (!bar.genes.length) return { error: `"${group.name}": none of the genes has a value to plot.` };
    return { group: { ...base, genes: bar.genes }, valueLabel: bar.valueLabel };
  };

  const saveAndGenerate = () => {
    const sourceCategories = isStructured
      ? categories
      : [makeCategory([], [{ ...makeGroup({ plotType, siblingGroups: [], takenColors: [], themeKey, text: singleText }), color: singleColor }])];

    const readCategories = sourceCategories.map((category) => ({ category, results: category.groups.map(readGroup) }));
    const firstError = readCategories.flatMap((entry) => entry.results).find((result) => result.error);
    if (firstError) return setErrorMessage(firstError.error);

    const valueLabels = new Set(readCategories.flatMap((entry) => entry.results).map((result) => result.valueLabel).filter(Boolean));
    if (valueLabels.size > 1) {
      return setErrorMessage('Similarity scores (Semantic search) and lengths ("Find about genes") cannot be mixed in one bar plot.');
    }

    const readyCategories = readCategories.map(({ category, results }) => ({
      id: category.id, name: category.name, groups: results.map((result) => result.group),
    }));
    const groupCount = readyCategories.reduce((total, category) => total + category.groups.length, 0);
    if (!groupCount) return setErrorMessage("Paste some data first.");
    if (plotType === "heatmap" && groupCount < 2) return setErrorMessage("A heatmap needs two or more groups. Press + to add another group.");

    setErrorMessage("");
    onGenerate({ categories: readyCategories, valueLabel: [...valueLabels][0] });
  };

  // The heatmap can compare more than gene IDs when a "Find about genes" table is pasted.
  const annotationTableDetected = plotType === "heatmap" && categories.some((category) =>
    category.groups.some((group) => parsePastedData(plotType, group.text).kind === TABLE_KIND.ANNOTATION));

  const chooserProps = { themeKey, onThemeChange: setThemeKey };

  return (
    <div className="editor">
      <h3 className="editor__title">Editor</h3>
      {plotType === "bar" && <p className="editor__note">{BAR_EDITOR_NOTE}</p>}

      {annotationTableDetected && (
        <div className="editor__notice" role="status">
          <span>More than one qualitative column detected.</span>
          <label className="editor__notice-field">
            Compare groups by:
            <select className="field__control" value={measureKey} onChange={(event) => onMeasureChange(event.target.value)}>
              {HEATMAP_MEASURES.map((measure) => <option key={measure.key} value={measure.key}>{measure.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {!isStructured && (
        <>
          <div className="editor__toolbar">
            <div className="editor__customize">
              <Button onClick={() => setSingleChooserOpen((open) => !open)} onMouseDown={(event) => event.stopPropagation()}>
                Customize
                <span className="button__swatch" style={{ "--swatch-color": singleColor }} />
              </Button>
              {singleChooserOpen && (
                <ColorChooser
                  className="editor__customize-chooser" color={singleColor} onChange={setSingleColor}
                  onClose={() => setSingleChooserOpen(false)} {...chooserProps}
                />
              )}
            </div>
            <Button onClick={switchToCategories}>+ Add category and groups</Button>
          </div>
          <div className="editor__paste-area">
            <textarea
              className="editor__paste-textarea" value={singleText} placeholder={PASTE_HINT[plotType]} spellCheck={false}
              onChange={(event) => setSingleText(event.target.value)}
            />
          </div>
          <DataSummary plotType={plotType} text={singleText} />
        </>
      )}

      {isStructured && categories.map((category, categoryIndex) => (
        <section key={category.id} className="editor-category">
          {!groupsOnly && (
            <div className="editor-category__header">
              <div className="editor-category__pill">
                <NameInput
                  className="editor-category__name" label="Category name"
                  value={category.name} defaultName={category.defaultName}
                  onChange={(name) => updateCategory(category.id, { name })}
                />
                <span className="editor-group__rename-hint">(Click to rename)</span>
                {categories.length > 1 && (
                  <button type="button" className="editor__remove-button" title="Remove category" onClick={() => removeCategory(category.id)}>×</button>
                )}
              </div>
              {categoryIndex === categories.length - 1 && <Button onClick={addCategory}>+ Add another category</Button>}
            </div>
          )}

          <div className="editor-category__groups">
            {category.groups.map((group) => (
              <GroupBox
                key={group.id} plotType={plotType} group={group}
                placeholder={GROUP_PASTE_HINT[plotType]}
                showColor={plotType !== "heatmap"}
                canRemove={category.groups.length > 1}
                onChange={(updatedGroup) => updateGroup(category, updatedGroup)}
                onRemove={() => removeGroup(category, group.id)}
                {...chooserProps}
              />
            ))}
            <button type="button" className="editor__add-group-button" title="Add a group" aria-label="Add a group" onClick={() => addGroup(category)}>
              +
            </button>
          </div>
        </section>
      ))}

      {errorMessage && <p className="editor__message editor__message--error editor__message--block">{errorMessage}</p>}

      <div className="editor__footer">
        <Button variant="primary" onClick={saveAndGenerate}>Save and generate graph</Button>
        <Button onClick={onExit}>Exit editor without saving</Button>
      </div>
    </div>
  );
}
