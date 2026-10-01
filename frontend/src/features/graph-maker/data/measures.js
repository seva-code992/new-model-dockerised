// What a heatmap compares between two groups. "Gene IDs" always works; the other options
// need a table from "Find about genes", which carries these extra columns.

export const HEATMAP_MEASURES = [
  { key: "ids", label: "Gene IDs", column: null },
  { key: "chromosome", label: "Chromosomes", column: "Chromosome" },
  { key: "pfams", label: "PFAMs", column: "PFAMs" },
  { key: "kegg", label: "KEGG pathways", column: "KEGG pathway" },
];

export const DEFAULT_MEASURE_KEY = "ids";

export const findMeasure = (measureKey) =>
  HEATMAP_MEASURES.find((measure) => measure.key === measureKey) ?? HEATMAP_MEASURES[0];

/** The items of one gene that a group is compared on (a PFAM / KEGG cell can hold several). */
export function measureValues(gene, measure) {
  if (!measure.column) return [gene.id];
  const rawValue = gene.columns?.[measure.column];
  if (!rawValue) return [];
  return String(rawValue).split(/[;,|]/).map((part) => part.trim()).filter(Boolean);
}

/** Does any gene carry this measure's column? */
export const hasMeasureColumn = (groups, measure) =>
  !measure.column || groups.some((group) => group.genes.some((gene) => gene.columns?.[measure.column]));
