import React, { useState } from "react";
import { PALETTE, parseJsonGenes, parseTable, uid } from "./chartUtils.js";

const btn = "bg-[#D9D9D9] hover:bg-gray-300 border border-gray-400 text-black px-4 py-1.5 text-sm shadow-sm disabled:opacity-50";
const input = "border border-gray-400 bg-white px-2 py-1 text-sm text-black focus:outline-none";

/** Parse a pasted box according to the plot type. */
function parseFor(type, text) {
  if (type === "network") return parseJsonGenes(text);
  return parseTable(text, { allowIds: type === "heatmap" });
}

function PasteBox({ type, onAdd, label, placeholder }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const add = () => {
    const res = parseFor(type, text);
    if (!text.trim()) return setError("Paste some data first.");
    if (res.error) return setError(res.error);
    setError("");
    setText("");
    onAdd(text, res);
  };
  return (
    <div className="border-2 border-dashed border-gray-400 p-3 flex flex-col gap-2 min-w-[240px] flex-1 bg-white">
      <div className="text-sm font-bold text-black">{label}</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={placeholder}
        className={`${input} font-mono text-xs w-full`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={add} className={`${btn} self-start`} aria-label="Add">
        <span className="font-bold text-lg leading-none">+</span>
      </button>
    </div>
  );
}

function GroupBox({ type, group, onChange, onRemove, canRemove }) {
  const res = parseFor(type, group.text);
  return (
    <div className="border border-gray-400 p-3 flex flex-col gap-2 min-w-[240px] flex-1 bg-white">
      <div className="flex items-center gap-2">
        <input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          className={`${input} flex-1 font-bold`}
          aria-label="Group name"
        />
        {type === "bar" && (
          <input
            type="color" value={group.color}
            onChange={(e) => onChange({ ...group, color: e.target.value })}
            className="w-8 h-8 p-0 border border-gray-400 cursor-pointer" title="Group colour"
          />
        )}
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-red-600 font-bold px-1" title="Remove group">×</button>
        )}
      </div>
      <textarea
        value={group.text}
        onChange={(e) => onChange({ ...group, text: e.target.value })}
        rows={5}
        className={`${input} font-mono text-xs w-full`}
      />
      {res.error ? (
        <p className="text-xs text-red-600">{res.error}</p>
      ) : (
        <p className="text-xs text-gray-600">{res.genes.length} genes</p>
      )}
    </div>
  );
}

/**
 * Editor: paste data, press + to turn it into a category, Save it, repeat.
 * bar / heatmap categories hold named groups; network categories are a single JSON with one colour.
 */
export default function GraphEditor({ type, onGenerate, onBack }) {
  const [categories, setCategories] = useState([]);
  const [draft, setDraft] = useState(null);
  const [draftIndex, setDraftIndex] = useState(null);
  const [error, setError] = useState("");

  const grouped = type !== "network";
  const single = type === "heatmap";
  const nextNo = categories.length + 1;
  const table = type === "network" ? "JSON" : "table";

  const startDraft = (text) => {
    setError("");
    setDraftIndex(null);
    setDraft(grouped
      ? { id: uid(), name: `Category${nextNo}`, groups: [{ id: uid(), name: "Group1", color: PALETTE[0], text }] }
      : { id: uid(), name: `Query${nextNo}-Species${nextNo}`, color: PALETTE[(nextNo - 1) % PALETTE.length], text });
  };

  const addGroup = (text) => {
    const n = draft.groups.length;
    setDraft({ ...draft, groups: [...draft.groups, { id: uid(), name: `Group${n + 1}`, color: PALETTE[n % PALETTE.length], text }] });
  };

  const save = () => {
    let saved;
    if (grouped) {
      const groups = draft.groups.map((g) => ({ ...g, genes: parseFor(type, g.text).genes, err: parseFor(type, g.text).error }));
      if (groups.some((g) => g.err || !g.genes.length)) return setError("Every group needs valid, non-empty data.");
      if (type === "heatmap" && groups.length < 2) return setError("A heatmap needs at least two groups.");
      saved = { ...draft, groups: groups.map(({ err, ...g }) => g) };
    } else {
      const res = parseFor(type, draft.text);
      if (res.error || !res.genes.length) return setError(res.error || "Paste valid JSON first.");
      saved = { ...draft, genes: res.genes, query: res.query, species: res.species };
    }
    setCategories((cs) => (draftIndex === null ? [...cs, saved] : cs.map((c, i) => (i === draftIndex ? saved : c))));
    setDraft(null);
    setError("");
  };

  const edit = (i) => {
    const c = categories[i];
    setError("");
    setDraftIndex(i);
    setDraft(grouped
      ? { ...c, groups: c.groups.map((g) => ({ ...g, text: g.text ?? "" })) }
      : { ...c });
  };

  const canGenerate = categories.length >= 1 && !draft;
  const canAdd = !draft && !(single && categories.length >= 1);

  return (
    <div className="border-2 border-gray-400 bg-[#F4F4F4] p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-black">Editor</h3>
        <button type="button" onClick={onBack} className="text-sm text-[#0004FF] underline">← Back to options</button>
      </div>

      <p className="text-xs text-gray-700">
        {type === "network"
          ? "Paste the JSON from Semantic search (Copy → Copy in JSON format), press +, then save the category. Each category gets its own colour."
          : type === "heatmap"
            ? "Paste a table (or a list of gene IDs) for each group. A category with at least two groups is required."
            : "Paste the table from Semantic search (Copy → Copy table), press + to make it a category, add more groups next to it, then save."}
      </p>

      {/* saved categories */}
      {categories.map((c, i) => (
        <div key={c.id} className="bg-white border border-gray-300 p-3 flex items-center justify-between gap-3">
          <div className="text-sm text-black">
            {!grouped && <span className="inline-block w-3 h-3 rounded-full mr-2 border border-black" style={{ background: c.color }} />}
            <b>{c.name}</b>{" "}
            <span className="text-gray-600">
              {grouped ? `— ${c.groups.map((g) => `${g.name} (${g.genes.length})`).join(", ")}` : `— ${c.genes.length} genes`}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={() => edit(i)} disabled={!!draft}>Edit</button>
            <button type="button" className={btn} onClick={() => setCategories((cs) => cs.filter((_, k) => k !== i))} disabled={!!draft}>Delete</button>
          </div>
        </div>
      ))}

      {/* category being edited */}
      {draft && (
        <div className="bg-white border-2 border-black p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={`${input} font-bold text-base`} aria-label="Category name"
            />
            {!grouped && (
              <input
                type="color" value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="w-8 h-8 p-0 border border-gray-400 cursor-pointer" title="Category colour"
              />
            )}
            <span className="text-xs text-gray-500">(rename the category)</span>
          </div>

          {grouped ? (
            <div className="flex flex-wrap gap-3 items-stretch">
              {draft.groups.map((g, gi) => (
                <GroupBox
                  key={g.id} type={type} group={g}
                  canRemove={draft.groups.length > 1}
                  onChange={(ng) => setDraft({ ...draft, groups: draft.groups.map((x, k) => (k === gi ? ng : x)) })}
                  onRemove={() => setDraft({ ...draft, groups: draft.groups.filter((_, k) => k !== gi) })}
                />
              ))}
              <PasteBox type={type} onAdd={addGroup} label={`Add Group${draft.groups.length + 1}`} placeholder={`Paste another ${table} here`} />
            </div>
          ) : (
            <>
              <textarea
                value={draft.text} rows={6}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                className={`${input} font-mono text-xs w-full`}
              />
              {(() => {
                const r = parseFor(type, draft.text);
                return r.error
                  ? <p className="text-xs text-red-600">{r.error}</p>
                  : <p className="text-xs text-gray-600">{r.genes.length} genes{r.query ? ` · query: ${r.query}` : ""}{r.species ? ` · ${r.species}` : ""}</p>;
              })()}
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={save}>Save</button>
            <button type="button" className={btn} onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {canAdd && (
        <PasteBox
          type={type} onAdd={startDraft}
          label={categories.length ? `Paste a ${table} to start Category${nextNo}` : `Paste your ${table} here`}
          placeholder={type === "network" ? '{"query": "...", "genes": [...]}' : "Gene ID\tSimilarity score\tDescription"}
        />
      )}

      <div>
        <button type="button" className={`${btn} bg-[#62D0F6] hover:bg-[#4bc3eb]`} disabled={!canGenerate} onClick={() => onGenerate(categories)}>
          Generate graph
        </button>
        {categories.length > 0 && draft && <span className="ml-3 text-xs text-gray-600">Save the open category first.</span>}
      </div>
    </div>
  );
}
