import axios from "axios";

export interface Estado {
  sigla: string;
  nome: string;
  ibgeCodigo: string;
}

export interface Municipio {
  nome: string;
  ibgeCodigo: string;
}

export interface CepInfo {
  cep: string;
  logradouro: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  ibgeCodigoMunicipio: string;
  ibgeCodigoEstado: string;
}

export async function buscarCep(cep: string): Promise<CepInfo | null> {
  if (!cep) return null;

  try {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      return null;
    }

    const response = await axios.get(
      `https://viacep.com.br/ws/${cleanCep}/json/`
    );

    if (response.data?.erro) {
      return null;
    }

    return {
      cep: response.data?.cep ?? cleanCep,
      logradouro: response.data?.logradouro ?? "",
      complemento: response.data?.complemento ?? "",
      bairro: response.data?.bairro ?? "",
      cidade: response.data?.localidade ?? "",
      estado: response.data?.uf ?? "",
      ibgeCodigoMunicipio: response.data?.ibge ?? "",
      ibgeCodigoEstado: response.data?.gia ?? "",
    };
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
}

export async function listarEstados(): Promise<Estado[]> {
  try {
    const response = await axios.get(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
    );

    return (response.data as any[]).map((estado) => ({
      sigla: estado.sigla,
      nome: estado.nome,
      ibgeCodigo: String(estado.id),
    }));
  } catch (error) {
    console.error("Erro ao carregar estados:", error);
    return [];
  }
}

export async function listarMunicipios(uf: string): Promise<Municipio[]> {
  if (!uf) return [];
  try {
    const response = await axios.get(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
    );

    return (response.data as any[]).map((municipio) => ({
      nome: municipio.nome,
      ibgeCodigo: String(municipio.id),
    }));
  } catch (error) {
    console.error("Erro ao carregar municípios:", error);
    return [];
  }
}
