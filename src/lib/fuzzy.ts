import type { FieldEntry, FieldLibrary } from "./api";

export interface FuzzyMatch {
  entry: FieldEntry;
  categoryName: string;
  score: number;
}

/**
 * Case-insensitive substring matching with scoring.
 * Searches label (highest priority), value, and tags of each library entry.
 * Returns matches sorted by score, limited to `maxResults`.
 */
export function fuzzySearch(
  query: string,
  library: FieldLibrary,
  maxResults = 8,
): FuzzyMatch[] {
  if (query.length < 2) return [];

  const q = query.toLowerCase();
  const matches: FuzzyMatch[] = [];

  for (const category of library.categories) {
    for (const entry of category.fields) {
      let bestScore = 0;

      // Check label (highest priority)
      const labelIdx = entry.label.toLowerCase().indexOf(q);
      if (labelIdx >= 0) {
        bestScore = Math.max(bestScore, 100 + (labelIdx === 0 ? 20 : labelIdx <= 5 ? 10 : 0));
      }

      // Check value
      const valueIdx = entry.value.toLowerCase().indexOf(q);
      if (valueIdx >= 0) {
        bestScore = Math.max(bestScore, 80 + (valueIdx === 0 ? 20 : valueIdx <= 5 ? 10 : 0));
      }

      // Check tags
      for (const tag of entry.tags) {
        const tagIdx = tag.toLowerCase().indexOf(q);
        if (tagIdx >= 0) {
          bestScore = Math.max(bestScore, 60 + (tagIdx === 0 ? 20 : 0));
        }
      }

      if (bestScore > 0) {
        matches.push({ entry, categoryName: category.name, score: bestScore });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, maxResults);
}
