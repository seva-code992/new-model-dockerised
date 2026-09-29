// Shared helpers for the Graph maker: colours, parsing of pasted data, maths.

export const PALETTE = [
  "#0072B2", "#E69F00", "#009E73", "#D55E00",
  "#CC79A7", "#56B4E9", "#F0E442", "#000000",
];

export const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Parse the table copied from the Semantic search ("Copy table").
 * Columns: Gene ID <tab> Similarity score <tab> Description.
 * With allowIds, lines holding only a gene ID are accepted (used by the heatmap).
 */
export function parseTable(text, { allowIds = false } = {}) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { genes: [], error: "" };

  const first = lines[0].split("\t");
  const hasHeader = /gene/i.test(first[0]) && (first.length < 2 || isNaN(Number(first[1])));
  const genes = [];

  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const parts = lines[i].split("\t");
    const id = parts[0].trim();
    if (parts.length === 1) {
      if (!allowIds) {
        return { genes: [], error: `Line ${i + 1}: expected a tab-separated table (Gene ID, Similarity score, Description).` };
      }
      genes.push({ id, score: null, description: "" });
      continue;
    }
    const score = Number(parts[1]);
    if (!id || !Number.isFinite(score)) {
      return { genes: [], error: `Line ${i + 1}: similarity score must be a number.` };
    }
    genes.push({ id, score, description: parts.slice(2).join("\t").trim() });
  }
  return { genes, error: "" };
}

/** Parse the JSON copied from the Semantic search ("Copy in JSON format"). */
export function parseJsonGenes(text) {
  if (!text.trim()) return { genes: [], error: "" };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { genes: [], error: "This is not valid JSON." };
  }
  const arr = Array.isArray(data) ? data : data?.genes;
  if (!Array.isArray(arr) || !arr.length) {
    return { genes: [], error: 'Expected a JSON object with a non-empty "genes" list.' };
  }
  const genes = arr.map((g) => ({
    id: g.id ?? g.Gene,
    description: g.description ?? g.Description ?? "",
    score: g.similarity ?? g["Similarity score"] ?? null,
    embedding: g.embedding ?? g.Embedding,
  }));
  const bad = genes.findIndex((g) => !g.id || !Array.isArray(g.embedding) || !g.embedding.length);
  if (bad >= 0) {
    return { genes: [], error: `Gene ${bad + 1} has no id or no embedding. Copy the JSON again from the Semantic search.` };
  }
  const dim = genes[0].embedding.length;
  if (genes.some((g) => g.embedding.length !== dim)) {
    return { genes: [], error: "Embeddings have different lengths." };
  }
  return { genes, query: data?.query, species: data?.species, error: "" };
}

export function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  A.forEach((x) => B.has(x) && inter++);
  const union = A.size + B.size - inter;
  return { value: union ? inter / union : 0, inter, union };
}

export function cosine(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Import rows from an .xlsx file: A = label, B = value, optional C = group, D = description. */
export async function parseXlsx(file) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
  if (rows.length < 2) throw new Error("The sheet needs a header row and at least one data row.");

  const byGroup = new Map();
  rows.slice(1).forEach((r, i) => {
    if (r.every((c) => c === "")) return;
    const id = String(r[0]).trim();
    const score = Number(r[1]);
    if (!id) throw new Error(`Row ${i + 2}: first column (label) is empty.`);
    if (r[1] === "" || !Number.isFinite(score)) {
      throw new Error(`Row ${i + 2}: second column must be a number.`);
    }
    const group = String(r[2] ?? "").trim() || "Group1";
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push({ id, score, description: String(r[3] ?? "").trim() });
  });
  if (!byGroup.size) throw new Error("No data rows found.");

  return [{
    id: uid(),
    name: "Category1",
    groups: [...byGroup].map(([name, genes], i) => ({
      id: uid(), name, color: PALETTE[i % PALETTE.length], genes,
    })),
  }];
}

// ---- export ----------------------------------------------------------------

function serialize(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const vb = svg.viewBox.baseVal;
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", vb.width);
  bg.setAttribute("height", vb.height);
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  clone.setAttribute("width", vb.width);
  clone.setAttribute("height", vb.height);
  return { xml: new XMLSerializer().serializeToString(clone), w: vb.width, h: vb.height };
}

function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadSvg(svg, name = "gene-graph.svg") {
  save(new Blob([serialize(svg).xml], { type: "image/svg+xml" }), name);
}

export function downloadPng(svg, name = "gene-graph.png") {
  const { xml, w, h } = serialize(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((b) => save(b, name), "image/png");
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
