// Colour themes offered when choosing a dataset colour. New datasets pick from the active theme.

export const COLOR_THEMES = [
  {
    key: "paired",
    label: "Paired",
    colors: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6"],
  },
  {
    key: "pastel",
    label: "Pastel",
    colors: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec", "#f2f2f2"],
  },
  {
    key: "intense",
    label: "Intense",
    colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"],
  },
  {
    // The brief listed the same colours as "Intense" here; this is ColorBrewer's print/colour-blind friendly "Dark2".
    key: "print-friendly",
    label: "Print friendly",
    colors: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"],
  },
];

export const DEFAULT_THEME_KEY = "paired";

export const findTheme = (themeKey) =>
  COLOR_THEMES.find((theme) => theme.key === themeKey) ?? COLOR_THEMES[0];

/** A random colour of the theme that is not used yet (any theme colour once all are taken). */
export function pickThemeColor(themeKey, takenColors = []) {
  const { colors } = findTheme(themeKey);
  const taken = new Set(takenColors.map((color) => color.toLowerCase()));
  const free = colors.filter((color) => !taken.has(color.toLowerCase()));
  const pool = free.length ? free : colors;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** The n-th colour of a theme, wrapping around (used for imported files). */
export const themeColorAt = (themeKey, index) => {
  const { colors } = findTheme(themeKey);
  return colors[index % colors.length];
};
