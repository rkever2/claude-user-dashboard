import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getChartColor } from "@/lib/colors";
import { formatNumber } from "@/lib/format";

interface BarChartProps {
  data: Array<{ name: string; value: number; [key: string]: unknown }>;
  height?: number;
  layout?: "horizontal" | "vertical";
  formatValue?: (v: number) => string;
}

export function BarChart({
  data,
  height = 280,
  layout = "vertical",
  formatValue = formatNumber,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (layout === "vertical") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => formatValue(v)}
            tick={{ fontSize: 11, fill: "#888" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#222" }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            contentStyle={{ border: "1px solid #ddd", borderRadius: 0, boxShadow: "none", fontSize: 12 }}
            formatter={(value: number) => [formatValue(value), "Count"]}
          />
          <Bar dataKey="value" maxBarSize={24}>
            {data.map((_, index) => (
              <Cell key={index} fill={getChartColor(0)} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#888" }}
          axisLine={{ stroke: "#ddd" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => formatValue(v)}
          tick={{ fontSize: 11, fill: "#888" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ border: "1px solid #ddd", borderRadius: 0, boxShadow: "none", fontSize: 12 }}
          formatter={(value: number) => [formatValue(value), "Sessions"]}
        />
        <Bar dataKey="value" maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={getChartColor(0)}
              fillOpacity={Math.max(0.3, entry.value / maxValue)}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
