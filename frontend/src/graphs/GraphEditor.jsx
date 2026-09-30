import React, { useMemo, useState } from "react";
import { parseJsonGenes, parseTable, randomColor, uid } from "./chartUtils.js";

// ---- text shown to the user ------------------------------------------------

const PASTE_HINT = {
  bar: "Paste your data copied from the above features (copied as tables only).",
  heatmap: "Paste a table (or a list of gene IDs) copied from the above features.",
  network: "Paste your data copied from the Semantic search (copied in JSON format only).",
};
const NEW_GROUP_HINT = {
  bar: "Paste a table copied from the above search features.",
  heatmap: "Paste a table copied from the above search features.",
  network: "Paste the JSON copied from the Semantic search.",
};

// ---- helpers -------------------------------------------------------------

/** Read pasted text the way the chosen graph needs it. */
function parsePastedData(plotType, text) {
  if (plotType === "network") return parseJsonGenes(text);
  return parseTable(text, { allowIds: plotType === "heatmap" });
}

/**
 * Names that still have their default value are cleared on the first click (so the user can just type)
 * and restored if left empty. Names the user chose are edited in place.
 */
function NameInput({ value, defaultName, onChange, className, label }) {
  const isDefault = defaultName !== undefined && value === defaultName;
  return (
    <input
      className={className} value={value} placeholder={defaultName} aria-label={label}
      onFocus={() => { if (isDefault) onChange(""); }}
      onBlur={() => { if (!value.trim() && defaultName !== undefined) onChange(defaultName); }}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** The first "Prefix1", "Prefix2", ... name that none of the siblings already uses. */
function nextFreeName(makeName, siblings) {
  const used = new Set(siblings.flatMap((sibling) => [sibling.name, sibling.defaultName]));
  let number = 1;
  while (used.has(makeName(number))) number++;
  return makeName(number);
}

/** A new dataset gets the next free default name and a random colour unlike the ones already used. */
function makeGroup(plotType, siblingGroups, takenColors, text = "") {
  const makeName = (number) => (plotType === "network" ? `Query${number}-Species${number}` : `Group${number}`);
  const defaultName = nextFreeName(makeName, siblingGroups);
  return { id: uid(), defaultName, name: defaultName, color: randomColor(takenColors), text };
}

function makeCategory(siblingCategories, groups) {
  const defaultName = nextFreeName((number) => `Category${number}`, siblingCategories);
  return { id: uid(), defaultName, name: defaultName, groups };
}

// ---- small components ----------------------------------------------------

function DataSummary({ plotType, text }) {
  const parsed = useMemo(() => parsePastedData(plotType, text), [plotType, text]);
  if (!text.trim()) return null;
  if (parsed.error) return <p className="editor__message editor__message--error">{parsed.error}</p>;
  const origin = [parsed.query && `query: ${parsed.query}`, parsed.species].filter(Boolean).join(" · ");
  return <p className="editor__message">{parsed.genes.length} genes{origin ? ` · ${origin}` : ""}</p>;
}

/** A coloured box to paste one dataset into. Its colour chip opens the colour picker. */
function GroupBox({ plotType, group, placeholder, showColor, canRemove, onChange, onRemove }) {
  return (
    <div className="editor-group">
      <div className="editor-group__heading">
        <NameInput
          className="editor-group__name" label="Group name"
          value={group.name} defaultName={group.defaultName}
          onChange={(name) => onChange({ ...group, name })}
        />
        <span className="editor-group__rename-hint">(Click to rename)</span>
        {canRemove && (
          <button type="button" className="editor__remove-button" title="Remove group" onClick={onRemove}>×</button>
        )}
      </div>
      {showColor && <span className="editor-group__color-hint">Click the coloured frame to change its colour</span>}
      <div className={`editor-group__box ${showColor ? "" : "editor-group__box--plain"}`} style={{ "--group-color": group.color }}>
        {showColor && (
          <input
            className="editor-group__frame-picker" type="color" value={group.color}
            aria-label="Group colour (click the coloured frame)" title="Click to change the colour"
            onChange={(event) => onChange({ ...group, color: event.target.value })}
          />
        )}
        <textarea
          className="editor-group__textarea" value={group.text} placeholder={placeholder} spellCheck={false}
          onChange={(event) => onChange({ ...group, text: event.target.value })}
        />
      </div>
      <DataSummary plotType={plotType} text={group.text} />
    </div>
  );
}

// ---- the editor ----------------------------------------------------------

/**
 * plotType: "bar" | "heatmap" | "network"
 * seedCategories: optional [{id, name, groups: [{id, name, color, text}]}] to start from.
 *
 * Bar plot:  starts as one big paste box (+ "Customize" colour); "Add category and groups" turns it
 *            into Category1/Group1 and unlocks several categories with several groups each.
 * Heatmap and network plot: always work with groups only (a single hidden category).
 */
export default function GraphEditor({ plotType, seedCategories, onGenerate, onExit }) {
  const groupsOnly = plotType !== "bar";
  const [isStructured, setIsStructured] = useState(groupsOnly || !!seedCategories);
  const [singleText, setSingleText] = useState("");
  const [singleColor, setSingleColor] = useState(() => randomColor());
  const [categories, setCategories] = useState(
    () => seedCategories ?? (groupsOnly ? [makeCategory([], [makeGroup(plotType, [], [])])] : []),
  );
  const [errorMessage, setErrorMessage] = useState("");

  const colorsInUse = categories.flatMap((category) => category.groups.map((group) => group.color));

  // ---- changing the structure ----
  const switchToCategories = () => {
    setErrorMessage("");
    setCategories([makeCategory([], [{ ...makeGroup(plotType, [], [], singleText), color: singleColor }])]);
    setIsStructured(true);
  };
  const addCategory = () => {
    setCategories([...categories, makeCategory(categories, [makeGroup(plotType, [], colorsInUse)])]);
  };
  const updateCategory = (categoryId, changes) =>
    setCategories(categories.map((category) => (category.id === categoryId ? { ...category, ...changes } : category)));
  const removeCategory = (categoryId) =>
    setCategories(categories.filter((category) => category.id !== categoryId));
  const addGroup = (category) =>
    updateCategory(category.id, { groups: [...category.groups, makeGroup(plotType, category.groups, colorsInUse)] });
  const updateGroup = (category, updatedGroup) =>
    updateCategory(category.id, { groups: category.groups.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)) });
  const removeGroup = (category, groupId) =>
    updateCategory(category.id, { groups: category.groups.filter((group) => group.id !== groupId) });

  // ---- turning the pasted text into graph data ----
  const parseGroup = (group) => {
    const parsed = parsePastedData(plotType, group.text);
    if (!group.text.trim()) return { error: `"${group.name}" is empty. Paste data into it or remove it.` };
    if (parsed.error) return { error: `"${group.name}": ${parsed.error}` };
    return { group: { id: group.id, name: group.name, color: group.color, genes: parsed.genes } };
  };

  const saveAndGenerate = () => {
    const sourceCategories = isStructured
      ? categories
      : [makeCategory([], [{ ...makeGroup(plotType, [], [], singleText), color: singleColor }])];

    const parsedCategories = sourceCategories.map((category) => ({
      category,
      parsedGroups: category.groups.map(parseGroup),
    }));
    const firstError = parsedCategories.flatMap((entry) => entry.parsedGroups).find((entry) => entry.error);
    if (firstError) return setErrorMessage(firstError.error);

    const readyCategories = parsedCategories.map(({ category, parsedGroups }) => ({
      id: category.id,
      name: category.name,
      groups: parsedGroups.map((entry) => entry.group),
    }));
    const groupCount = readyCategories.reduce((total, category) => total + category.groups.length, 0);
    if (!readyCategories.length || !groupCount) return setErrorMessage("Paste some data first.");
    if (plotType === "heatmap" && groupCount < 2) return setErrorMessage("A heatmap needs two or more groups. Press + to add another group.");

    setErrorMessage("");
    onGenerate(readyCategories);
  };

  // ---- rendering ----
  return (
    <div className="editor">
      <h3 className="editor__title">Editor</h3>

      {!isStructured && (
        <>
          <div className="editor__toolbar">
            <label className="gm-button gm-button--customize">
              Customize
              <span className="gm-button__swatch" style={{ "--swatch-color": singleColor }} />
              <input
                className="editor__hidden-input" type="color" value={singleColor} aria-label="Dataset colour"
                onChange={(event) => setSingleColor(event.target.value)}
              />
            </label>
            <button type="button" className="gm-button gm-button--add-category" onClick={switchToCategories}>
              + Add category and groups
            </button>
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
              {categoryIndex === categories.length - 1 && (
                <button type="button" className="gm-button gm-button--add-another-category" onClick={addCategory}>
                  + Add another category
                </button>
              )}
            </div>
          )}

          <div className="editor-category__groups">
            {category.groups.map((group, groupIndex) => (
              <GroupBox
                key={group.id} plotType={plotType} group={group}
                placeholder={NEW_GROUP_HINT[plotType]}
                showColor={plotType !== "heatmap"}
                canRemove={category.groups.length > 1}
                onChange={(updatedGroup) => updateGroup(category, updatedGroup)}
                onRemove={() => removeGroup(category, group.id)}
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
        <button type="button" className="gm-button gm-button--primary" onClick={saveAndGenerate}>Save and generate graph</button>
        <button type="button" className="gm-button" onClick={onExit}>Exit editor without saving</button>
      </div>
    </div>
  );
}
