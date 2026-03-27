import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getChartColor } from "@/lib/colors";
import { formatDate, formatCurrency } from "@/lib/format";

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Array<{ key: string; label: string }>;
  height?: number;
  formatValue?: (v: number) => string;
}

export function LineChart({
  data,
  xKey,
  series,
  height = 280,
  formatValue = formatCurrency,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          contentStyle={{ border: "1px solid #ddd", borderRadius: 0, boxShadow: "none", fontSize: 12 }}
          formatter={(value: number, name: string) => [formatValue(value), name]}
          labelFormatter={formatDate}
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={getChartColor(i)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
