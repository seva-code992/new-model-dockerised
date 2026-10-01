// Species offered by the search features, always listed alphabetically.

const byName = (a, b) => a.localeCompare(b);

/** Semantic search covers every species. */
export const SEMANTIC_SEARCH_SPECIES = [
  "Arabidopsis thaliana",
  "Betula pendula",
  "Picea abies",
  "Pinus Sylvestris",
  "Populus tremula",
  "Tilia tomentosa",
].sort(byName);

/** "Find about genes" has no Arabidopsis data. */
export const KEYWORD_SEARCH_SPECIES = SEMANTIC_SEARCH_SPECIES.filter((name) => name !== "Arabidopsis thaliana");
