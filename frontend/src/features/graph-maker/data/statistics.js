/** Jaccard index of two lists: shared items / all distinct items. */
export function jaccard(listA, listB) {
  const setA = new Set(listA);
  const setB = new Set(listB);
  const shared = [...setA].filter((item) => setB.has(item));
  const unionSize = setA.size + setB.size - shared.length;
  return { value: unionSize ? shared.length / unionSize : 0, shared, sharedCount: shared.length, unionSize };
}

/** Cosine similarity of two embedding vectors (0 when their lengths differ). */
export function cosine(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vectorA.length; i++) {
    dot += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}
