import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/errorHandler";
import PageHeader from "@/components/PageHeader";
import { Baby, Save, X } from "lucide-react";

export default function CriancaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeTenantId } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (id) {
      loadCrianca();
    }
  }, [id]);

  const loadCrianca = async () => {
    try {
      const response = await api.get(`/recemnascido/${id}`);
      const dados = response.data;
      const dataNascimentoIso = dados.dataNascimento
        ? new Date(dados.dataNascimento).toISOString().split("T")[0]
        : "";

      reset({
        ...dados,
        dataNascimento: dataNascimentoIso,
        idadeGestacionalSemanas:
          dados.idadeGestacionalSemanas !== undefined &&
          dados.idadeGestacionalSemanas !== null
            ? Number(dados.idadeGestacionalSemanas).toString()
            : "",
        pesoNascimentoGr:
          dados.pesoNascimentoGr !== undefined &&
          dados.pesoNascimentoGr !== null
            ? Number(dados.pesoNascimentoGr).toString()
            : "",
        comprimentoCm:
          dados.comprimentoCm !== undefined && dados.comprimentoCm !== null
            ? Number(dados.comprimentoCm).toString()
            : "",
        perimetroCefalicoCm:
          dados.perimetroCefalicoCm !== undefined &&
          dados.perimetroCefalicoCm !== null
            ? Number(dados.perimetroCefalicoCm).toString()
            : "",
      });
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Erro ao carregar dados da criança", {
        duration: 5000,
      });
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const tenantId = activeTenantId;
      if (!tenantId) {
        toast.error("Selecione uma unidade antes de salvar o cadastro.");
        return;
      }
      const toNullableNumber = (value: any) =>
        value === undefined || value === null || value === ""
          ? null
          : Number(value);

      const payload = {
        id,
        tenantId,
        nome: data.nome,
        sexo: data.sexo,
        dataNascimento: data.dataNascimento,
        idadeGestacionalSemanas: toNullableNumber(
          data.idadeGestacionalSemanas
        ),
        pesoNascimentoGr: toNullableNumber(data.pesoNascimentoGr),
        comprimentoCm: toNullableNumber(data.comprimentoCm),
        perimetroCefalicoCm: toNullableNumber(data.perimetroCefalicoCm),
      };

      if (id) {
        await api.put(`/recemnascido/${id}`, payload);
        toast.success("Dados atualizados com sucesso!");
      } else {
        await api.post("/recemnascido", payload);
        toast.success("Criança cadastrada com sucesso!");
      }

      navigate("/criancas");
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Erro ao salvar. Tente novamente.", {
        duration: 5000,
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={id ? "Editar Criança" : "Nova Criança"}
        subtitle="Preencha os dados do recém-nascido"
        icon={Baby}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                {...register("nome", { required: true })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Nome do recém-nascido"
              />
              {errors.nome && (
                <span className="text-red-500 text-sm">Campo obrigatório</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sexo *
              </label>
              <select
                {...register("sexo", { required: true })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento *
              </label>
              <input
                {...register("dataNascimento", { required: true })}
                type="date"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade Gestacional (semanas) *
              </label>
              <input
                {...register("idadeGestacionalSemanas", { required: true })}
                type="number"
                step="0.1"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: 37,5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso ao Nascer (gramas)
              </label>
              <input
                {...register("pesoNascimentoGr")}
                type="number"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: 3200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comprimento (cm)
              </label>
              <input
                {...register("comprimentoCm")}
                type="number"
                step="0.1"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: 48,5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perímetro Cefálico (cm)
              </label>
              <input
                {...register("perimetroCefalicoCm")}
                type="number"
                step="0.1"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: 34,2"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="submit"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => navigate("/criancas")}
              className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
