import { TABLE_KIND } from "./tableParsing.js";

// What a bar plot draws for each kind of pasted table:
//   Semantic search table  -> bar height = similarity score
//   Find about genes table -> bar height = gene length
// Everything else in the table becomes hover information.

const isFilled = ([, value]) => value !== undefined && value !== "";

/** Turn a parsed table into plot genes: { id, value, details: [[label, text], ...] }. */
export function toBarGenes(parsed) {
  if (parsed.kind === TABLE_KIND.SEMANTIC) {
    const genes = parsed.genes.map((gene) => ({
      id: gene.id,
      value: gene.similarity,
      details: Object.entries(gene.columns).filter(([label]) => label !== "Gene ID" && label !== "Similarity score").filter(isFilled),
    }));
    return { genes, valueLabel: "Similarity score", skippedCount: 0 };
  }
  if (parsed.kind === TABLE_KIND.ANNOTATION) {
    if (!parsed.genes.some((gene) => "Length" in gene.columns)) {
      return { error: "This table has no Length column to plot." };
    }
    const withLength = parsed.genes.filter((gene) => gene.length !== null);
    const genes = withLength.map((gene) => ({
      id: gene.id,
      value: gene.length,
      details: Object.entries(gene.columns).filter(([label]) => label !== "Gene ID" && label !== "Length").filter(isFilled),
    }));
    return { genes, valueLabel: "Length", skippedCount: parsed.genes.length - withLength.length };
  }
  return { error: "A bar plot needs a table with scores or lengths, not only gene IDs." };
}
