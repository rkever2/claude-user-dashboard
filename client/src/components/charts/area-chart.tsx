import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getChartColor } from "@/lib/colors";
import { formatNumber, formatDate } from "@/lib/format";

interface AreaChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Array<{ key: string; label: string }>;
  height?: number;
  stacked?: boolean;
  formatValue?: (v: number) => string;
}

export function AreaChart({
  data,
  xKey,
  series,
  height = 280,
  stacked = false,
  formatValue = formatNumber,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ddd" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: "#888" }}
          axisLine={{ stroke: "#ddd" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatValue(v)}
          tick={{ fontSize: 11, fill: "#888" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid #ddd",
            borderRadius: 0,
            boxShadow: "none",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [formatValue(value), name]}
          labelFormatter={formatDate}
        />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            stroke={getChartColor(i)}
            fill={getChartColor(i)}
            fillOpacity={stacked ? 0.8 : 0.45}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
