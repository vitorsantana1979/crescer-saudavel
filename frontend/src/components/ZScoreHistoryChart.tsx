import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  label: string;
  value: number | null | undefined;
};

interface ZScoreHistoryChartProps {
  title: string;
  data: ChartPoint[];
  color?: string;
}

const Y_DOMAIN: [number, number] = [-4, 4];
const Y_TICKS = [-3, -2, -1, 0, 1, 2, 3];

export default function ZScoreHistoryChart({
  title,
  data,
  color = "#16a34a",
}: ZScoreHistoryChartProps) {
  const hasValues = data.some(
    (point) => point.value !== null && point.value !== undefined
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">
          Evolução dos z-scores ao longo dos atendimentos
        </p>
      </div>

      <div className="h-72">
        {data.length === 0 || !hasValues ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Sem dados suficientes para gerar o gráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={Y_DOMAIN}
                ticks={Y_TICKS}
                width={40}
                tick={{ fontSize: 12 }}
              />
              <ReferenceLine
                y={0}
                stroke="#15803d"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              <ReferenceLine y={1} stroke="#ea580c" strokeDasharray="4 4" />
              <ReferenceLine y={-1} stroke="#ea580c" strokeDasharray="4 4" />
              <ReferenceLine y={2} stroke="#dc2626" strokeDasharray="4 4" />
              <ReferenceLine y={-2} stroke="#dc2626" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
              <Tooltip
                formatter={(value: number | null | undefined) => [
                  value === null || value === undefined
                    ? "-"
                    : value.toFixed(2),
                  "Z-Score",
                ]}
                labelFormatter={(label: string) => `Data: ${label}`}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

