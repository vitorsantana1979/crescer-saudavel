import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function ChartZScore({ data, referencia }: any) {
  return (
    <LineChart width={350} height={250}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="idadeSemanas" label={{ value: "Semanas", position: "insideBottomRight" }} />
      <YAxis label={{ value: "Peso (kg)", angle: -90, position: "insideLeft" }} />
      {referencia?.map((curva: any) => (
        <Line
          key={curva.z}
          type="monotone"
          dataKey="valor"
          data={curva.valores}
          stroke="#ccc"
          dot={false}
        />
      ))}
      <Line
        type="monotone"
        dataKey="pesoKg"
        data={data}
        stroke="#22c55e"
        strokeWidth={3}
        dot
      />
      <Tooltip />
    </LineChart>
  );
}
