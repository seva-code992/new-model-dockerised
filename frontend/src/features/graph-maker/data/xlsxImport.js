import { DEFAULT_THEME_KEY, themeColorAt } from "./palettes.js";
import { uid } from "./uid.js";

/**
 * Read an .xlsx for the bar plot: row 1 = headers, column A = label, column B = number,
 * optional column C = group name, optional column D = description.
 * Returns { categories, valueLabel } where valueLabel is the header of column B.
 */
export async function parseXlsx(file) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer());
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
  if (rows.length < 2) throw new Error("The sheet needs a header row and at least one data row.");

  const valueLabel = String(rows[0][1] ?? "").trim() || "Value";
  const genesByGroup = new Map();
  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => cell === "")) return;
    const id = String(row[0]).trim();
    const value = Number(row[1]);
    const rowNumber = index + 2;
    if (!id) throw new Error(`Row ${rowNumber}: first column (label) is empty.`);
    if (row[1] === "" || !Number.isFinite(value)) throw new Error(`Row ${rowNumber}: second column must be a number.`);
    const groupName = String(row[2] ?? "").trim() || "Group1";
    if (!genesByGroup.has(groupName)) genesByGroup.set(groupName, []);
    const description = String(row[3] ?? "").trim();
    genesByGroup.get(groupName).push({ id, value, details: description ? [["Description", description]] : [] });
  });
  if (!genesByGroup.size) throw new Error("No data rows found.");

  const groups = [...genesByGroup].map(([name, genes], index) => ({
    id: uid(),
    name,
    color: themeColorAt(DEFAULT_THEME_KEY, index),
    // The editor can reopen this data as a table (Customize).
    text: ["Gene ID\tSimilarity score\tDescription", ...genes.map((gene) => `${gene.id}\t${gene.value}\t${gene.details[0]?.[1] ?? ""}`)].join("\n"),
    genes,
  }));
  return { categories: [{ id: uid(), name: "Category1", groups }], valueLabel };
}
