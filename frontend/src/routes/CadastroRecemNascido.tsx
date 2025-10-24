import { useForm } from "react-hook-form";
import { api } from "@/lib/api";

export default function CadastroRecemNascido() {
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    const tenantId = localStorage.getItem("tenantId") || "";
    await api.post("/recemnascido", { ...data, tenantId });
    alert("Recém-nascido cadastrado!");
    reset();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Cadastrar Recém-Nascido</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4 max-w-lg"
      >
        <input {...register("nome")} placeholder="Nome" className="border p-2 rounded" />
        <input {...register("sexo")} placeholder="Sexo (M/F)" className="border p-2 rounded" />
        <input {...register("dataNascimento")} type="date" className="border p-2 rounded" />
        <input {...register("idadeGestacionalSemanas")} placeholder="Semanas Gestacionais" className="border p-2 rounded" />
        <input {...register("pesoNascimentoGr")} placeholder="Peso ao nascer (g)" className="border p-2 rounded" />
        <button type="submit" className="col-span-2 bg-green-600 text-white p-2 rounded">
          Salvar
        </button>
      </form>
    </div>
  );
}
