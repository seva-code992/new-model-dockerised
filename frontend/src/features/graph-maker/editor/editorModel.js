import { uid } from "../data/uid.js";
import { parseJsonGenes, parseTable } from "../data/tableParsing.js";
import { pickThemeColor } from "../data/palettes.js";

// ---- text shown to the user ------------------------------------------------

export const PASTE_HINT = {
  bar: "Paste your data copied from the above features (copied as tables only).",
  heatmap: "Paste a table (or a list of gene IDs) copied from the above features.",
  network: "Paste your data copied from the Semantic search (copied in JSON format only).",
};

export const GROUP_PASTE_HINT = {
  bar: "Paste a table copied from the above search features.",
  heatmap: "Paste a table copied from the above search features.",
  network: "Paste the JSON copied from the Semantic search.",
};

export const BAR_EDITOR_NOTE =
  'If your data comes from the Semantic search feature, the Y axis shows the similarity score to the searched query. ' +
  'If you paste a table from the "Find about genes" feature, the Y axis shows the genes\' length. ' +
  "The hover information shows the rest of the data you pasted.";

// ---- reading pasted data ---------------------------------------------------

/** Read pasted text the way the chosen graph needs it. */
export function parsePastedData(plotType, text) {
  if (plotType === "network") return parseJsonGenes(text);
  return parseTable(text, { allowIds: plotType === "heatmap" });
}

// ---- creating groups and categories ------------------------------------------

/** The first "Prefix1", "Prefix2", ... name that none of the siblings already uses. */
function nextFreeName(makeName, siblings) {
  const used = new Set(siblings.flatMap((sibling) => [sibling.name, sibling.defaultName]));
  let number = 1;
  while (used.has(makeName(number))) number++;
  return makeName(number);
}

/** A new dataset gets the next free default name and a random unused colour of the active theme. */
export function makeGroup({ plotType, siblingGroups, takenColors, themeKey, text = "" }) {
  const makeName = (number) => (plotType === "network" ? `Query${number}-Species${number}` : `Group${number}`);
  const defaultName = nextFreeName(makeName, siblingGroups);
  return { id: uid(), defaultName, name: defaultName, color: pickThemeColor(themeKey, takenColors), text };
}

export function makeCategory(siblingCategories, groups) {
  const defaultName = nextFreeName((number) => `Category${number}`, siblingCategories);
  return { id: uid(), defaultName, name: defaultName, groups };
}
