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

// Cells holding one of these are "not available": the information is not registered yet.
// That is very different from two genes sharing a value, so such cells never count as similar.
const MISSING_MARKERS = new Set(["", "-", "–", "—", "na", "n/a", "nan", "null"]);
export const isMissingValue = (text) => MISSING_MARKERS.has(String(text ?? "").trim().toLowerCase());

/** The items of one gene that a group is compared on (a PFAM / KEGG cell can hold several). Missing data gives none. */
export function measureValues(gene, measure) {
  if (!measure.column) return [gene.id];
  const rawValue = gene.columns?.[measure.column];
  if (isMissingValue(rawValue)) return [];
  return String(rawValue).split(/[;,|]/).map((part) => part.trim()).filter((part) => !isMissingValue(part));
}

/** value -> genes of the group that carry it, for the chosen measure. */
export function genesByMeasureValue(group, measure) {
  const byValue = new Map();
  group.genes.forEach((gene) => {
    measureValues(gene, measure).forEach((value) => {
      if (!byValue.has(value)) byValue.set(value, []);
      byValue.get(value).push(gene);
    });
  });
  return byValue;
}

/** How many genes of the group have no data for this measure (always 0 for gene IDs). */
export const countGenesWithoutData = (group, measure) =>
  group.genes.filter((gene) => measureValues(gene, measure).length === 0).length;

/** Does any gene carry this measure's column? */
export const hasMeasureColumn = (groups, measure) =>
  !measure.column || groups.some((group) => group.genes.some((gene) => gene.columns && measure.column in gene.columns));
