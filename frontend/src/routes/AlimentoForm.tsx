import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Apple, Save, X } from "lucide-react";

export default function AlimentoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm();
  const { activeTenantId } = useAuth();

  useEffect(() => {
    if (id) {
      loadAlimento();
    }
  }, [id]);

  const loadAlimento = async () => {
    try {
      const response = await api.get(`/alimentos/${id}`);
      reset(response.data);
    } catch (error) {
      toast.error("Erro ao carregar dados do alimento");
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (!activeTenantId) {
        toast.error("Selecione uma unidade antes de salvar o alimento.");
        return;
      }

      // Converter campos numéricos vazios para null e booleanos
      const payload = {
        ...data,
        tenantId: activeTenantId,
        idadeMinimaSemanas: data.idadeMinimaSemanas 
          ? parseInt(data.idadeMinimaSemanas, 10) 
          : null,
        idadeMaximaSemanas: data.idadeMaximaSemanas 
          ? parseInt(data.idadeMaximaSemanas, 10) 
          : null,
        ehPreTermo: data.ehPreTermo === true || data.ehPreTermo === "true",
        excluido: false
      };

      if (id) {
        await api.put(`/alimentos/${id}`, payload);
        toast.success("Alimento atualizado com sucesso!");
      } else {
        await api.post("/alimentos", payload);
        toast.success("Alimento cadastrado com sucesso!");
      }

      navigate("/alimentos");
    } catch (error) {
      toast.error("Erro ao salvar. Tente novamente.");
    }
  };

  return (
    <div>
      <PageHeader
        title={id ? "Editar Alimento" : "Novo Alimento"}
        subtitle="Cadastro de alimentos para composição de dietas"
        icon={Apple}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Alimento *
              </label>
              <input
                {...register("nome", { required: true })}
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: Leite materno"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                {...register("categoria", { required: true })}
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">Selecione</option>
                <option value="leite">Leite</option>
                <option value="formula">Fórmula</option>
                <option value="complemento">Complemento</option>
                <option value="fortificante">Fortificante</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade de Medida *
              </label>
              <select
                {...register("unidade", { required: true })}
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">Selecione</option>
                <option value="ml">ml (mililitros)</option>
                <option value="g">g (gramas)</option>
                <option value="colher">colher</option>
                <option value="sachê">sachê</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Energia (kcal por 100 ml/g) *
              </label>
              <input
                {...register("energiaKcalPor100", { required: true })}
                type="number"
                step="0.1"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: 67.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proteína (g por 100 ml/g) *
              </label>
              <input
                {...register("proteinaGPor100", { required: true })}
                type="number"
                step="0.1"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: 1.3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade Mínima (semanas)
              </label>
              <input
                {...register("idadeMinimaSemanas")}
                type="number"
                min="0"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: 0 (opcional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Idade mínima em semanas para uso deste alimento
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade Máxima (semanas)
              </label>
              <input
                {...register("idadeMaximaSemanas")}
                type="number"
                min="0"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: 96 (opcional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Idade máxima em semanas para uso deste alimento
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register("ehPreTermo")}
                  type="checkbox"
                  className="w-4 h-4 text-primary border-gray-400 rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">
                  Indicado para prematuros (pré-termo)
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => navigate("/alimentos")}
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
