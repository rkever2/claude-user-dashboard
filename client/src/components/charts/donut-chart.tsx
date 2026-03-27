import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS_HEX } from "@/lib/colors";

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (v: number) => string;
}

export function DonutChart({
  data,
  height = 280,
  centerLabel,
  centerValue,
  formatValue = (v) => v.toLocaleString(),
}: DonutChartProps) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            dataKey="value"
            stroke="none"
            paddingAngle={1}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={CHART_COLORS_HEX[index % CHART_COLORS_HEX.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ border: "1px solid #ddd", borderRadius: 0, boxShadow: "none", fontSize: 12 }}
            formatter={(value: number) => [formatValue(value)]}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-display text-2xl font-bold">{centerValue}</p>
          <p className="text-[10px] uppercase tracking-[0.05em] text-muted font-medium">{centerLabel}</p>
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ data }: { data: Array<{ name: string; value: number; percentage?: number }> }) {
  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => (
        <div key={item.name} className="flex items-center gap-2">
          <div
            className="w-3 h-3 shrink-0"
            style={{ background: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }}
          />
          <span className="text-sm flex-1">{item.name}</span>
          {item.percentage !== undefined && (
            <span className="text-xs font-mono text-muted">{item.percentage.toFixed(1)}%</span>
          )}
        </div>
      ))}
    </div>
  );
}
