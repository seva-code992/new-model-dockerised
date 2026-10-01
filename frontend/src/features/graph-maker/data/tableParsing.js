// Reading what the user pastes into the editor.
//
//  - Semantic search table:   Gene ID | Similarity score | Description
//  - "Find about genes" table: Gene ID | Description | Chromosome | Strand | Length | Start | End | PFAMs | GO terms | KEGG pathway
//  - Semantic search JSON:    { query, species, genes: [{ id, description, similarity, embedding }] }

/** Which kind of table was pasted. */
export const TABLE_KIND = { SEMANTIC: "semantic", ANNOTATION: "annotation", IDS: "ids" };

const SEMANTIC_COLUMNS = ["Gene ID", "Similarity score", "Description"];
const ANNOTATION_COLUMNS = ["Gene ID", "Description", "Chromosome", "Strand", "Length", "Start", "End", "PFAMs", "GO terms", "KEGG pathway"];

// Header spellings we accept, mapped to the canonical column name.
const HEADER_ALIASES = {
  "gene id": "Gene ID", gene: "Gene ID",
  "similarity score": "Similarity score",
  description: "Description",
  chromosome: "Chromosome",
  strand: "Strand",
  length: "Length",
  start: "Start",
  end: "End",
  pfams: "PFAMs", pfam: "PFAMs",
  "go terms": "GO terms", gos: "GO terms",
  "kegg pathway": "KEGG pathway", kegg: "KEGG pathway",
};

const canonicalHeader = (text) => HEADER_ALIASES[text.trim().toLowerCase()] ?? text.trim();
const isNumber = (text) => text !== undefined && text.trim() !== "" && Number.isFinite(Number(text));

/**
 * Parse a pasted table. With allowIds, a plain list of gene IDs is accepted as well (heatmap).
 * Returns { genes, kind, error }. Every gene keeps all of its columns in `columns`,
 * so charts can show the data they do not plot as hover information.
 */
export function parseTable(text, { allowIds = false } = {}) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { genes: [], kind: null, error: "" };

  const rows = lines.map((line) => line.split("\t"));
  const widestRow = Math.max(...rows.map((row) => row.length));
  const firstRow = rows[0];
  const hasHeader = /gene/i.test(firstRow[0]) && (firstRow.length < 2 || !isNumber(firstRow[1]));

  let headers;
  if (hasHeader) headers = firstRow.map(canonicalHeader);
  else if (widestRow > 3) headers = ANNOTATION_COLUMNS.slice(0, widestRow);
  else if (widestRow === 3 || (widestRow === 2 && isNumber(firstRow[1]))) headers = SEMANTIC_COLUMNS.slice(0, widestRow);
  else headers = ["Gene ID"];

  let kind;
  if (headers.includes("Similarity score")) kind = TABLE_KIND.SEMANTIC;
  else if (headers.length > 1) kind = TABLE_KIND.ANNOTATION;
  else kind = TABLE_KIND.IDS;

  if (kind === TABLE_KIND.IDS && !allowIds) {
    return { genes: [], kind, error: "Expected a tab-separated table copied from the Semantic search or Find about genes." };
  }

  const genes = [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const cells = dataRows[rowIndex];
    const columns = {};
    headers.forEach((header, columnIndex) => { columns[header] = (cells[columnIndex] ?? "").trim(); });
    const id = columns["Gene ID"];
    const lineNumber = rowIndex + 1 + (hasHeader ? 1 : 0);
    if (!id) return { genes: [], kind, error: `Line ${lineNumber}: the gene ID is empty.` };

    let similarity = null;
    if (kind === TABLE_KIND.SEMANTIC) {
      if (!isNumber(columns["Similarity score"])) {
        return { genes: [], kind, error: `Line ${lineNumber}: similarity score must be a number.` };
      }
      similarity = Number(columns["Similarity score"]);
    }
    genes.push({
      id,
      description: columns.Description ?? "",
      similarity,
      length: isNumber(columns.Length) ? Number(columns.Length) : null,
      columns,
    });
  }
  return { genes, kind, error: "" };
}

/** Parse the JSON copied with "Copy in JSON format" (needs an embedding for every gene). */
export function parseJsonGenes(text) {
  if (!text.trim()) return { genes: [], error: "" };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { genes: [], error: "This is not valid JSON." };
  }
  const rawGenes = Array.isArray(data) ? data : data?.genes;
  if (!Array.isArray(rawGenes) || !rawGenes.length) {
    return { genes: [], error: 'Expected a JSON object with a non-empty "genes" list.' };
  }
  const genes = rawGenes.map((gene) => ({
    id: gene.id ?? gene.Gene,
    description: gene.description ?? gene.Description ?? "",
    similarity: gene.similarity ?? gene["Similarity score"] ?? null,
    embedding: gene.embedding ?? gene.Embedding,
  }));
  const badIndex = genes.findIndex((gene) => !gene.id || !Array.isArray(gene.embedding) || !gene.embedding.length);
  if (badIndex >= 0) {
    return { genes: [], error: `Gene ${badIndex + 1} has no id or no embedding. Copy the JSON again from the Semantic search.` };
  }
  const dimension = genes[0].embedding.length;
  if (genes.some((gene) => gene.embedding.length !== dimension)) {
    return { genes: [], error: "Embeddings have different lengths." };
  }
  return { genes, query: data?.query, species: data?.species, error: "" };
}
