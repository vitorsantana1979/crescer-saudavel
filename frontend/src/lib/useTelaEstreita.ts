import { useEffect, useState } from "react";

/** true abaixo de 640 px (breakpoint `sm` do Tailwind): gráficos simplificam eixos e rótulos. */
export function useTelaEstreita(): boolean {
  const consulta = "(max-width: 639px)";
  const [estreita, setEstreita] = useState(() => typeof window !== "undefined" && window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const atualizar = () => setEstreita(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);
  return estreita;
}
