// Hex colors for Recharts (which doesn't support oklch in all contexts)
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
