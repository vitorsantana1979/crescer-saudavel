import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ChartZScore from "@/components/ChartZScore";

export default function Acompanhamento() {
  const [data, setData] = useState<any[]>([]);
  const [referencia, setReferencia] = useState<any[]>([]);

  useEffect(() => {
    api.get("/graficos/zscore/demo-id").then((res) => setData(res.data.dataConsultas));
    api.get("/graficos/referencia/m/oms/peso/12").then((res) => setReferencia(res.data));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Acompanhamento</h2>
      <ChartZScore data={data} referencia={referencia} />
    </div>
  );
}
