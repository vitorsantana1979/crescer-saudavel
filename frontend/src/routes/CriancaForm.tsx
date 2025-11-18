import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/errorHandler";
import PageHeader from "@/components/PageHeader";
import { Baby, Save, X, AlertCircle } from "lucide-react";
import {
  classificarIdadeGestacional,
  classificarPesoNascimento,
  formatarIdadeGestacional,
  formatarPeso,
} from "@/lib/classificacoes";

export default function CriancaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeTenantId } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm();

  // Observar valores para calcular classificações em tempo real
  const idadeGestacionalSemanas = useWatch({ control, name: "idadeGestacionalSemanas" });
  const idadeGestacionalDias = useWatch({ control, name: "idadeGestacionalDias" });
  const pesoNascimentoGr = useWatch({ control, name: "pesoNascimentoGr" });

  // Calcular classificações
  const classificacaoIG =
    idadeGestacionalSemanas && Number(idadeGestacionalSemanas) > 0
      ? classificarIdadeGestacional(Number(idadeGestacionalSemanas))
      : null;

  const classificacaoPN =
    pesoNascimentoGr && Number(pesoNascimentoGr) > 0
      ? classificarPesoNascimento(Number(pesoNascimentoGr))
      : null;

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
        idadeGestacionalDias:
          dados.idadeGestacionalDias !== undefined &&
          dados.idadeGestacionalDias !== null
            ? Number(dados.idadeGestacionalDias).toString()
            : "",
        idadeGestacionalCorrigidaSemanas:
          dados.idadeGestacionalCorrigidaSemanas !== undefined &&
          dados.idadeGestacionalCorrigidaSemanas !== null
            ? Number(dados.idadeGestacionalCorrigidaSemanas).toString()
            : "",
        idadeGestacionalCorrigidaDias:
          dados.idadeGestacionalCorrigidaDias !== undefined &&
          dados.idadeGestacionalCorrigidaDias !== null
            ? Number(dados.idadeGestacionalCorrigidaDias).toString()
            : "",
        tipoParto: dados.tipoParto || "",
        apgar1Minuto:
          dados.apgar1Minuto !== undefined && dados.apgar1Minuto !== null
            ? Number(dados.apgar1Minuto).toString()
            : "",
        apgar5Minuto:
          dados.apgar5Minuto !== undefined && dados.apgar5Minuto !== null
            ? Number(dados.apgar5Minuto).toString()
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
        idadeGestacionalDias: toNullableNumber(data.idadeGestacionalDias),
        idadeGestacionalCorrigidaSemanas: toNullableNumber(
          data.idadeGestacionalCorrigidaSemanas
        ),
        idadeGestacionalCorrigidaDias: toNullableNumber(
          data.idadeGestacionalCorrigidaDias
        ),
        tipoParto: data.tipoParto || null,
        apgar1Minuto: toNullableNumber(data.apgar1Minuto),
        apgar5Minuto: toNullableNumber(data.apgar5Minuto),
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
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
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
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
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
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade Gestacional - Semanas *
              </label>
              <input
                {...register("idadeGestacionalSemanas", { required: true })}
                type="number"
                step="0.1"
                min="0"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: 34"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade Gestacional - Dias
              </label>
              <input
                {...register("idadeGestacionalDias", {
                  min: 0,
                  max: 6,
                })}
                type="number"
                min="0"
                max="6"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="0-6"
              />
              {errors.idadeGestacionalDias && (
                <span className="text-red-500 text-sm">
                  Deve ser entre 0 e 6 dias
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IGC - Semanas
              </label>
              <input
                {...register("idadeGestacionalCorrigidaSemanas")}
                type="number"
                step="0.1"
                min="0"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: 34"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IGC - Dias
              </label>
              <input
                {...register("idadeGestacionalCorrigidaDias", {
                  min: 0,
                  max: 6,
                })}
                type="number"
                min="0"
                max="6"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="0-6"
              />
              {errors.idadeGestacionalCorrigidaDias && (
                <span className="text-red-500 text-sm">
                  Deve ser entre 0 e 6 dias
                </span>
              )}
            </div>

            {/* Classificação por Idade Gestacional */}
            {classificacaoIG && (
              <div className="md:col-span-2">
                <div className={`border-2 rounded-lg p-4 ${classificacaoIG.cor}`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        Classificação segundo a Idade Gestacional (IG)
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">IG:</span>{" "}
                          {formatarIdadeGestacional(
                            Number(idadeGestacionalSemanas),
                            idadeGestacionalDias ? Number(idadeGestacionalDias) : undefined
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Classificação:</span>{" "}
                          <span className="font-bold">{classificacaoIG.sigla}</span> -{" "}
                          {classificacaoIG.descricao}
                        </p>
                        <p className="text-xs opacity-75">{classificacaoIG.faixa}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Parto
              </label>
              <select
                {...register("tipoParto")}
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">Selecione</option>
                <option value="Cesáreo">Cesáreo</option>
                <option value="Normal">Normal</option>
                <option value="Fórceps">Fórceps</option>
                <option value="Vácuo-extrator">Vácuo-extrator</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apgar 1º Minuto
              </label>
              <input
                {...register("apgar1Minuto", {
                  min: 0,
                  max: 10,
                })}
                type="number"
                min="0"
                max="10"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="0-10"
              />
              {errors.apgar1Minuto && (
                <span className="text-red-500 text-sm">
                  Deve ser entre 0 e 10
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apgar 5º Minuto
              </label>
              <input
                {...register("apgar5Minuto", {
                  min: 0,
                  max: 10,
                })}
                type="number"
                min="0"
                max="10"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="0-10"
              />
              {errors.apgar5Minuto && (
                <span className="text-red-500 text-sm">
                  Deve ser entre 0 e 10
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso ao Nascer (gramas)
              </label>
              <input
                {...register("pesoNascimentoGr")}
                type="number"
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
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
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
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
                className="w-full border border-gray-400 rounded-lg px-4 py-2 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Ex: 34,2"
              />
            </div>

            {/* Classificação por Peso ao Nascer */}
            {classificacaoPN && (
              <div className="md:col-span-2">
                <div className={`border-2 rounded-lg p-4 ${classificacaoPN.cor}`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        Classificação segundo o Peso ao Nascer (PN)
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">PN:</span>{" "}
                          {pesoNascimentoGr} g ({formatarPeso(Number(pesoNascimentoGr))})
                        </p>
                        <p>
                          <span className="font-medium">Classificação:</span>{" "}
                          <span className="font-bold">{classificacaoPN.nome}</span>
                        </p>
                        <p className="text-xs opacity-75">{classificacaoPN.faixa}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
