// Numbers shown beside the network graph: which genes are best connected, and which have an identical partner.

export const PERFECT_MATCH = 0.999999; // cosine similarity counted as "equal to 1"
export const TOP_GENE_COUNT = 5;

const roundForTies = (total) => Number(total.toFixed(2)); // the value the user sees decides whether genes tie

/**
 * Looks only at the genes that are currently shown (isVisible[i] for node i).
 * Returns { ranked, perfectGenes }:
 *   ranked        - [{ node, total }] sorted by the sum of similarity to all other shown genes, highest first
 *   perfectGenes  - genes that have a partner with similarity 1
 */
export function summarizeConnections(nodes, pairs, isVisible) {
  const totalSimilarity = new Array(nodes.length).fill(0);
  const hasPerfectMatch = new Array(nodes.length).fill(false);
  pairs.forEach((pair) => {
    if (!isVisible[pair.source] || !isVisible[pair.target]) return;
    totalSimilarity[pair.source] += pair.similarity;
    totalSimilarity[pair.target] += pair.similarity;
    if (pair.similarity >= PERFECT_MATCH) {
      hasPerfectMatch[pair.source] = true;
      hasPerfectMatch[pair.target] = true;
    }
  });
  const ranked = nodes
    .map((node, index) => ({ node, total: totalSimilarity[index], index }))
    .filter((entry) => isVisible[entry.index])
    .sort((a, b) => b.total - a.total);
  const perfectGenes = nodes.filter((_, index) => isVisible[index] && hasPerfectMatch[index]);
  return { ranked, perfectGenes };
}

/**
 * The best TOP_GENE_COUNT genes, plus every further gene that has the same total as the last of them
 * (so a tie for 5th place is never cut off).
 */
export function splitTopGenes(ranked) {
  const top = ranked.slice(0, TOP_GENE_COUNT);
  const tiedExtra = [];
  if (ranked.length > TOP_GENE_COUNT) {
    const cutoff = roundForTies(top[TOP_GENE_COUNT - 1].total);
    for (const entry of ranked.slice(TOP_GENE_COUNT)) {
      if (roundForTies(entry.total) !== cutoff) break;
      tiedExtra.push(entry);
    }
  }
  return { top, tiedExtra };
}
