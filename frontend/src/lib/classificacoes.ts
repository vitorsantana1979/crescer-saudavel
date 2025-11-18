// Funções para classificar recém-nascidos segundo IG e PN

export interface ClassificacaoIG {
  sigla: string;
  descricao: string;
  faixa: string;
  cor: string;
}

export interface ClassificacaoPN {
  nome: string;
  descricao: string;
  faixa: string;
  cor: string;
}

/**
 * Classifica o recém-nascido segundo a idade gestacional
 */
export function classificarIdadeGestacional(semanas: number): ClassificacaoIG {
  if (semanas < 28) {
    return {
      sigla: "RNPTE",
      descricao: "Recém-Nascido Pré-Termo Extremo",
      faixa: "IG < 28 semanas",
      cor: "bg-red-100 text-red-800 border-red-300",
    };
  }
  
  if (semanas >= 28 && semanas < 34) {
    return {
      sigla: "RNPTM",
      descricao: "Recém-Nascido Pré-Termo Moderado",
      faixa: "IG ≥ 28 < 34 semanas",
      cor: "bg-orange-100 text-orange-800 border-orange-300",
    };
  }
  
  if (semanas >= 34 && semanas < 37) {
    return {
      sigla: "RNPTT",
      descricao: "Recém-Nascido Pré-Termo Tardio",
      faixa: "IG ≥ 34 < 37 semanas",
      cor: "bg-yellow-100 text-yellow-800 border-yellow-300",
    };
  }
  
  if (semanas >= 37 && semanas < 42) {
    return {
      sigla: "RNT",
      descricao: "Recém-Nascido a Termo",
      faixa: "IG ≥ 37 < 42 semanas",
      cor: "bg-green-100 text-green-800 border-green-300",
    };
  }
  
  return {
    sigla: "RNP",
    descricao: "Recém-Nascido Pós-Termo",
    faixa: "IG ≥ 42 semanas",
    cor: "bg-blue-100 text-blue-800 border-blue-300",
  };
}

/**
 * Classifica o recém-nascido segundo o peso ao nascer (em gramas)
 */
export function classificarPesoNascimento(pesoGr: number): ClassificacaoPN {
  if (pesoGr >= 4000) {
    return {
      nome: "Macrossomia",
      descricao: "Macrossomia",
      faixa: "PN ≥ 4.000g",
      cor: "bg-purple-100 text-purple-800 border-purple-300",
    };
  }
  
  if (pesoGr >= 3000 && pesoGr <= 3999) {
    return {
      nome: "Peso Adequado",
      descricao: "Peso Adequado",
      faixa: "PN ≥ 3.000g E ≤ 3.999g",
      cor: "bg-green-100 text-green-800 border-green-300",
    };
  }
  
  if (pesoGr >= 2500 && pesoGr <= 2999) {
    return {
      nome: "Peso Insuficiente",
      descricao: "Peso Insuficiente",
      faixa: "PN ≥ 2.500g E ≤ 2.999g",
      cor: "bg-yellow-100 text-yellow-800 border-yellow-300",
    };
  }
  
  if (pesoGr >= 1500 && pesoGr < 2500) {
    return {
      nome: "Baixo Peso",
      descricao: "Baixo Peso",
      faixa: "PN ≥ 1.500g E < 2.500g",
      cor: "bg-orange-100 text-orange-800 border-orange-300",
    };
  }
  
  if (pesoGr >= 1000 && pesoGr < 1500) {
    return {
      nome: "Muito Baixo Peso",
      descricao: "Muito Baixo Peso",
      faixa: "PN ≥ 1.000g E < 1.500g",
      cor: "bg-red-100 text-red-800 border-red-300",
    };
  }
  
  if (pesoGr < 1000) {
    return {
      nome: "Extremo Baixo Peso",
      descricao: "Extremo Baixo Peso",
      faixa: "PN < 1.000g",
      cor: "bg-red-200 text-red-900 border-red-400",
    };
  }
  
  return {
    nome: "Não classificado",
    descricao: "Não classificado",
    faixa: "",
    cor: "bg-gray-100 text-gray-800 border-gray-300",
  };
}

/**
 * Formata IG em formato legível (ex: "32 semanas e 3 dias")
 */
export function formatarIdadeGestacional(semanas: number, dias?: number): string {
  const diasFormatado = dias && dias > 0 ? ` e ${dias} dia${dias > 1 ? "s" : ""}` : "";
  return `${Math.floor(semanas)} semana${Math.floor(semanas) !== 1 ? "s" : ""}${diasFormatado}`;
}

/**
 * Formata peso em kg com 3 casas decimais
 */
export function formatarPeso(gramas: number): string {
  return (gramas / 1000).toFixed(3) + " kg";
}


