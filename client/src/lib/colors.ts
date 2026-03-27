export const CHART_COLORS = [
  "oklch(72.27% 0.192 149.58)", // green (brand)
  "oklch(65% 0.15 250)",        // blue
  "oklch(75% 0.12 80)",         // amber
  "oklch(60% 0.18 320)",        // purple
  "oklch(70% 0.14 30)",         // coral
];

// Hex fallbacks for Recharts (which doesn't support oklch in all contexts)
export const CHART_COLORS_HEX = [
  "#2ba84a", // green
  "#4a7cf7", // blue
  "#d4a843", // amber
  "#a855f7", // purple
  "#e07845", // coral
];

export function getChartColor(index: number): string {
  return CHART_COLORS_HEX[index % CHART_COLORS_HEX.length];
}
