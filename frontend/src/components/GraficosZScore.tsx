import { useMemo, useState, useRef } from "react";
import toast from "react-hot-toast";
import GraficoOms from "@/components/GraficoOms";
import GraficoIntergrowth from "@/components/GraficoIntergrowth";
import GraficoPesoEstatura from "@/components/GraficoPesoEstatura";
import { diasEntre, formatarZ, idadeGestacionalEmDias, idadesNaData } from "@/lib/crescimento";
import {
  pontosIntergrowth as montarPontosIntergrowth,
  pontosOms as montarPontosOms,
  pontosPesoEstatura as montarPontosPesoEstatura,
  type AtendimentoGrafico,
} from "@/lib/pontosGrafico";

// Atendimento como chega da API (campos usados pelos gráficos e pelo cabeçalho)
type ConsultaItem = AtendimentoGrafico;

interface DietaItem {
  id: string;
  alimentoId: string;
  quantidade: number;
  energiaTotalKcal?: number;
  proteinaTotalG?: number;
  alimento?: {
    nome: string;
    categoria: string;
    unidade: string;
    energiaKcalPor100?: number;
    proteinaGPor100?: number;
  };
}

interface DietaAtual {
  id: string;
  dataInicio: string;
  dataFim?: string;
  frequenciaHoras: number;
  taxaEnergeticaKcalKg?: number;
  metaProteinaGKg?: number;
  pesoReferenciaKg?: number;
  viaAdministracao?: string;
  observacoes?: string;
  itens: DietaItem[];
}

interface GraficosZScoreProps {
  consultasSelecionadas?: ConsultaItem[];
  sexo?: string; // "M" ou "F"
  idadeGestacionalSemanas?: number; // Semanas de gestação ao nascimento
  idadeGestacionalDias?: number; // Dias de gestação ao nascimento (0-6)
  dataNascimento?: string; // Data de nascimento para calcular idade corrigida
  nomeCrianca?: string; // Nome do recém-nascido
  pesoNascimentoGr?: number; // Peso ao nascer em gramas
  comprimentoCm?: number; // Comprimento ao nascer em cm
  perimetroCefalicoNascimentoCm?: number; // Perímetro cefálico ao nascer em cm
  tipoParto?: string; // Tipo de parto
  apgar1Minuto?: number; // Apgar 1 minuto
  apgar5Minuto?: number; // Apgar 5 minutos
  dietaAtual?: DietaAtual; // Dieta atual do RN
}

// Cores dos eixos e títulos conforme sexo (padrão OMS)
const CORES_SEXO = {
  M: {
    // Azul para meninos
    primaria: "#2196F3",      // Azul principal
    secundaria: "#1976D2",    // Azul escuro
    texto: "#1565C0",          // Azul para texto
    eixo: "#2196F3",           // Cor dos eixos
  },
  F: {
    // Rosa para meninas
    primaria: "#E91E63",      // Rosa principal
    secundaria: "#C2185B",    // Rosa escuro
    texto: "#AD1457",          // Rosa para texto
    eixo: "#E91E63",           // Cor dos eixos
  },
};

export default function GraficosZScore({
  consultasSelecionadas = [],
  sexo = "M",
  idadeGestacionalSemanas = 40,
  idadeGestacionalDias = 0,
  dataNascimento,
  nomeCrianca,
  pesoNascimentoGr,
  comprimentoCm,
  perimetroCefalicoNascimentoCm,
  tipoParto,
  apgar1Minuto,
  apgar5Minuto,
  dietaAtual,
}: GraficosZScoreProps) {
  const [exportando, setExportando] = useState(false);
  const areaGraficoRef = useRef<HTMLDivElement>(null);
  const cardCompletoRef = useRef<HTMLDivElement>(null);
  const [exportandoCard, setExportandoCard] = useState(false);
  const [copiando, setCopiando] = useState(false);
  
  // Determinar se é pré-termo (< 37 semanas gestacionais)
  const ehPretermo = idadeGestacionalSemanas < 37;

  // Cálculos para exibição de dados do RN
  const calcularIdadeCronologica = useMemo(
    () => (dataNascimento ? diasEntre(dataNascimento, new Date()) : null),
    [dataNascimento]
  );

  // Idade pós-menstrual hoje (IGC), pelo helper único de idades
  const calcularIGCAtual = useMemo(() => {
    if (!dataNascimento || !idadeGestacionalSemanas) return null;
    const pm = idadesNaData({ dataNascimento, idadeGestacionalSemanas, idadeGestacionalDias }).posMenstrualDias;
    return pm == null ? null : { semanas: Math.floor(pm / 7), dias: pm % 7 };
  }, [dataNascimento, idadeGestacionalSemanas, idadeGestacionalDias]);

  // Obter peso atual e calcular diferença
  const pesoAtualInfo = useMemo(() => {
    if (!consultasSelecionadas || consultasSelecionadas.length === 0 || !pesoNascimentoGr) {
      return null;
    }
    const consultasOrdenadas = [...consultasSelecionadas].sort(
      (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
    );
    const ultimaConsulta = consultasOrdenadas[0];
    const pesoAtualGr = ultimaConsulta.pesoKg * 1000;
    const diferenca = pesoAtualGr - pesoNascimentoGr;
    return {
      pesoGr: pesoAtualGr,
      diferenca,
      dataConsulta: ultimaConsulta.dataHora,
    };
  }, [consultasSelecionadas, pesoNascimentoGr]);

  // Calcular totais de energia e proteína da dieta
  const totaisDieta = useMemo(() => {
    // Permitir mostrar mesmo sem itens, se tiver taxa/meta definida
    if (!dietaAtual) {
      return null;
    }
    
    // Peso de referência: usa o definido na dieta, ou peso atual, ou peso nascimento
    const pesoKg = dietaAtual.pesoReferenciaKg 
      || (pesoAtualInfo ? pesoAtualInfo.pesoGr / 1000 : null) 
      || ((pesoNascimentoGr || 0) / 1000);
    
    // Necessidades definidas pelo profissional (taxa × peso)
    const necessidadeEnergetica = (dietaAtual.taxaEnergeticaKcalKg && pesoKg) 
      ? dietaAtual.taxaEnergeticaKcalKg * pesoKg 
      : null;
    const necessidadeProteica = (dietaAtual.metaProteinaGKg && pesoKg) 
      ? dietaAtual.metaProteinaGKg * pesoKg 
      : null;
    
    // Calcular energia e proteína fornecidas pelos itens da dieta
    const totalEnergiaPorMamada = dietaAtual.itens?.reduce((acc, item) => {
      if (item.energiaTotalKcal && item.energiaTotalKcal > 0) {
        return acc + item.energiaTotalKcal;
      }
      if (item.alimento?.energiaKcalPor100 && item.quantidade) {
        return acc + (item.quantidade * item.alimento.energiaKcalPor100 / 100);
      }
      return acc;
    }, 0) || 0;
    
    const totalProteinaPorMamada = dietaAtual.itens?.reduce((acc, item) => {
      if (item.proteinaTotalG && item.proteinaTotalG > 0) {
        return acc + item.proteinaTotalG;
      }
      if (item.alimento?.proteinaGPor100 && item.quantidade) {
        return acc + (item.quantidade * item.alimento.proteinaGPor100 / 100);
      }
      return acc;
    }, 0) || 0;
    
    // Frequência por dia (24h / frequencia em horas)
    const frequenciaDia = 24 / dietaAtual.frequenciaHoras;
    
    // Total diário fornecido pela dieta
    const energiaDiariaFornecida = totalEnergiaPorMamada * frequenciaDia;
    const proteinaDiariaFornecida = totalProteinaPorMamada * frequenciaDia;
    
    // Por kg fornecido
    const energiaKgDiaFornecida = pesoKg > 0 ? energiaDiariaFornecida / pesoKg : 0;
    const proteinaKgDiaFornecida = pesoKg > 0 ? proteinaDiariaFornecida / pesoKg : 0;
    
    // Percentuais de adequação (fornecido / necessidade × 100)
    const adequacaoEnergia = necessidadeEnergetica && necessidadeEnergetica > 0 
      ? (energiaDiariaFornecida / necessidadeEnergetica) * 100 
      : null;
    const adequacaoProteina = necessidadeProteica && necessidadeProteica > 0 
      ? (proteinaDiariaFornecida / necessidadeProteica) * 100 
      : null;
    
    return {
      // Parâmetros definidos pelo profissional
      taxaEnergetica: dietaAtual.taxaEnergeticaKcalKg,
      metaProteica: dietaAtual.metaProteinaGKg,
      pesoReferencia: pesoKg,
      viaAdministracao: dietaAtual.viaAdministracao,
      
      // Necessidades calculadas (taxa × peso)
      necessidadeEnergetica,
      necessidadeProteica,
      
      // Valores fornecidos pela dieta
      energiaPorMamada: totalEnergiaPorMamada,
      proteinaPorMamada: totalProteinaPorMamada,
      energiaDiaria: energiaDiariaFornecida,
      proteinaDiaria: proteinaDiariaFornecida,
      energiaKgDia: energiaKgDiaFornecida,
      proteinaKgDia: proteinaKgDiaFornecida,
      frequenciaDia,
      
      // Adequação (%)
      adequacaoEnergia,
      adequacaoProteina,
    };
  }, [dietaAtual, pesoAtualInfo, pesoNascimentoGr]);

  // Histórico de peso para tabela
  const historicoConsultas = useMemo(() => {
    if (!consultasSelecionadas || consultasSelecionadas.length === 0 || !dataNascimento) {
      return [];
    }
    
    return consultasSelecionadas
      .map((consulta) => {
        const dataConsulta = new Date(consulta.dataHora);
        // IG ao nascer + idade cronológica (idade pós-menstrual) na data da consulta
        const igc = idadeGestacionalEmDias(idadeGestacionalSemanas, idadeGestacionalDias) + diasEntre(dataNascimento, consulta.dataHora);
        const igcSemanas = Math.floor(igc / 7);
        const igcDias = igc % 7;

        return {
          id: consulta.id,
          data: dataConsulta,
          igcSemanas,
          igcDias,
          pesoKg: consulta.pesoKg,
          estaturaCm: consulta.estaturaCm,
          perimetroCefalicoCm: consulta.perimetroCefalicoCm,
          zScorePeso: consulta.zScorePeso,
          zScoreAltura: consulta.zScoreAltura,
          zScorePerimetro: consulta.zScorePerimetro,
        };
      })
      .sort((a, b) => a.data.getTime() - b.data.getTime());
  }, [consultasSelecionadas, dataNascimento, idadeGestacionalSemanas, idadeGestacionalDias]);

  const dadosNascimento = useMemo(
    () => (dataNascimento ? { dataNascimento, idadeGestacionalSemanas, idadeGestacionalDias } : null),
    [dataNascimento, idadeGestacionalSemanas, idadeGestacionalDias]
  );
  // OMS: a termo (idade cronológica) e pré-termo após 64 semanas (idade corrigida)
  const pontosOms = useMemo(
    () => (dadosNascimento ? montarPontosOms(consultasSelecionadas, dadosNascimento) : []),
    [consultasSelecionadas, dadosNascimento]
  );
  const mostrarGraficoOms = !ehPretermo || pontosOms.length > 0;
  // INTERGROWTH-21st: pré-termo até 64 semanas pós-menstruais
  const pontosIntergrowth = useMemo(
    () => (dadosNascimento && ehPretermo ? montarPontosIntergrowth(consultasSelecionadas, dadosNascimento) : []),
    [consultasSelecionadas, dadosNascimento, ehPretermo]
  );
  // Peso para comprimento/estatura (OMS), com o comprimento corrigido pela posição da medida
  const pontosPesoEstatura = useMemo(
    () => (dadosNascimento ? montarPontosPesoEstatura(consultasSelecionadas, dadosNascimento) : []),
    [consultasSelecionadas, dadosNascimento]
  );

  const exportarGraficoComoJpeg = async (): Promise<string> => {
    if (!areaGraficoRef.current) {
      throw new Error("Container do gráfico não encontrado.");
    }

    const svgElement = areaGraficoRef.current.querySelector("svg.recharts-surface");
    if (!svgElement) {
      throw new Error("Elemento SVG do gráfico não encontrado.");
    }

    const bbox = svgElement.getBoundingClientRect();
    const width = Math.ceil(bbox.width);
    const height = Math.ceil(bbox.height);

    if (width === 0 || height === 0) {
      throw new Error("Dimensões do gráfico inválidas para exportação.");
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("width", `${width}`);
    clonedSvg.setAttribute("height", `${height}`);
    if (!clonedSvg.getAttribute("viewBox")) {
      clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    const svgMarkup = new XMLSerializer().serializeToString(clonedSvg);
    const svgUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);

    const imagemSvg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("Não foi possível rasterizar o SVG do gráfico."));
      img.src = svgUrl;
    });

    const chartCanvas = document.createElement("canvas");
    chartCanvas.width = width * pixelRatio;
    chartCanvas.height = height * pixelRatio;
    const chartCtx = chartCanvas.getContext("2d");
    if (!chartCtx) {
      throw new Error("Contexto 2D indisponível para exportação.");
    }
    chartCtx.fillStyle = "#ffffff";
    chartCtx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
    chartCtx.scale(pixelRatio, pixelRatio);
    chartCtx.drawImage(imagemSvg, 0, 0, width, height);
    chartCtx.setTransform(1, 0, 0, 1, 0, 0);

    const padding = 32;
    // Legenda removida - não precisa mais de espaço para ela
    const headerHeight = 180; // Altura do cabeçalho
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = (width + padding * 2) * pixelRatio;
    outputCanvas.height = (height + padding * 2 + headerHeight) * pixelRatio;

    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) {
      throw new Error("Contexto 2D indisponível para exportação final.");
    }
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    outCtx.scale(pixelRatio, pixelRatio);

    // Desenhar cabeçalho
    const headerStartY = padding;
    let currentY = headerStartY;
    const headerStartX = padding;
    const headerWidth = width;

    // Título principal
    outCtx.fillStyle = "#0f172a";
    outCtx.font = "bold 20px 'Inter', sans-serif";
    const generoTexto = sexo === "F" ? "MENINAS" : "MENINOS";
    const tipoTexto = ehPretermo ? " - PRÉ-TERMO" : " - A TERMO";
    const titulo = `Curvas de crescimento ${generoTexto}${tipoTexto}`;
    outCtx.fillText(titulo, headerStartX, currentY + 20);
    currentY += 35;

    // Subtítulo
    outCtx.fillStyle = "#475569";
    outCtx.font = "14px 'Inter', sans-serif";
    outCtx.fillText(
      ehPretermo ? "Idade pós-menstrual 27-64 semanas (z-scores)" : "Nascimento até 5 anos (z-scores)",
      headerStartX,
      currentY + 14
    );
    currentY += 25;

    // WHO Child Growth Standards
    outCtx.fillStyle = "#64748b";
    outCtx.font = "12px 'Inter', sans-serif";
    outCtx.fillText(
      ehPretermo ? "INTERGROWTH-21st (© University of Oxford) e WHO Child Growth Standards" : "WHO Child Growth Standards",
      headerStartX,
      currentY + 12
    );
    currentY += 30;

    // Linha separadora
    outCtx.strokeStyle = "#e2e8f0";
    outCtx.lineWidth = 1;
    outCtx.beginPath();
    outCtx.moveTo(headerStartX, currentY);
    outCtx.lineTo(headerStartX + headerWidth, currentY);
    outCtx.stroke();
    currentY += 20;

    // Dados do RN
    if (nomeCrianca || dataNascimento || pesoNascimentoGr || comprimentoCm) {
      outCtx.fillStyle = "#0f172a";
      outCtx.font = "bold 12px 'Inter', sans-serif";
      outCtx.fillText("Dados do Recém-Nascido:", headerStartX, currentY + 12);
      currentY += 20;

      const dadosLinhas: string[] = [];
      if (nomeCrianca) {
        dadosLinhas.push(`Nome: ${nomeCrianca}`);
      }
      if (dataNascimento) {
        const dataNasc = new Date(dataNascimento);
        const dataFormatada = dataNasc.toLocaleDateString("pt-BR");
        dadosLinhas.push(`Data de Nascimento: ${dataFormatada}`);
      }
      if (dataNascimento) {
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        const diasVida = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24));
        const semanasVida = Math.floor(diasVida / 7);
        const diasRestantes = diasVida % 7;
        dadosLinhas.push(`Idade Cronológica: ${semanasVida} semanas e ${diasRestantes} dias`);
      }
      if (ehPretermo && dataNascimento && idadeGestacionalSemanas && idadeGestacionalDias !== undefined) {
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        const diasVida = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24));
        const semanasVida = Math.floor(diasVida / 7);
        const diasRestantes = diasVida % 7;
        
        let igcSemanas = idadeGestacionalSemanas + semanasVida;
        let igcDias = (idadeGestacionalDias || 0) + diasRestantes;
        if (igcDias >= 7) {
          igcSemanas += Math.floor(igcDias / 7);
          igcDias = igcDias % 7;
        }
        dadosLinhas.push(`Idade Gestacional Corrigida: ${igcSemanas} semanas e ${igcDias} dias`);
      }
      if (pesoNascimentoGr) {
        const pesoKg = pesoNascimentoGr / 1000;
        dadosLinhas.push(`Peso ao Nascer: ${pesoKg.toFixed(3).replace(".", ",")} kg`);
      }
      if (comprimentoCm) {
        dadosLinhas.push(`Comprimento ao Nascer: ${comprimentoCm.toFixed(1).replace(".", ",")} cm`);
      }
      if (perimetroCefalicoNascimentoCm) {
        dadosLinhas.push(`Perímetro Cefálico ao Nascer: ${perimetroCefalicoNascimentoCm.toFixed(1).replace(".", ",")} cm`);
      }
      if (idadeGestacionalSemanas !== undefined && idadeGestacionalDias !== undefined) {
        dadosLinhas.push(`Idade Gestacional ao Nascimento: ${idadeGestacionalSemanas} semanas e ${idadeGestacionalDias} dias`);
      }

      outCtx.fillStyle = "#475569";
      outCtx.font = "11px 'Inter', sans-serif";
      dadosLinhas.forEach((linha, index) => {
        const coluna = index % 2;
        const linhaIndex = Math.floor(index / 2);
        const x = headerStartX + coluna * (headerWidth / 2 + 20);
        const y = currentY + linhaIndex * 18;
        outCtx.fillText(linha, x, y + 11);
      });
      currentY += Math.ceil(dadosLinhas.length / 2) * 18 + 10;
    }

    // Desenhar legenda (se pré-termo)
    // Legenda removida conforme solicitado

    // Desenhar gráfico abaixo do cabeçalho
    outCtx.drawImage(
      chartCanvas,
      padding,
      padding + headerHeight,
      width,
      height
    );

    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Redimensionar para largura padrão para documentos Word
    const LARGURA_PADRAO = 1400;
    const larguraOriginal = outputCanvas.width / pixelRatio;
    const alturaOriginal = outputCanvas.height / pixelRatio;
    const proporcao = alturaOriginal / larguraOriginal;
    const novaAltura = Math.round(LARGURA_PADRAO * proporcao);
    
    const canvasFinal = document.createElement("canvas");
    canvasFinal.width = LARGURA_PADRAO;
    canvasFinal.height = novaAltura;
    
    const ctxFinal = canvasFinal.getContext("2d");
    if (!ctxFinal) {
      throw new Error("Contexto 2D indisponível para redimensionamento.");
    }
    
    ctxFinal.fillStyle = "#ffffff";
    ctxFinal.fillRect(0, 0, LARGURA_PADRAO, novaAltura);
    ctxFinal.imageSmoothingEnabled = true;
    ctxFinal.imageSmoothingQuality = "high";
    ctxFinal.drawImage(outputCanvas, 0, 0, LARGURA_PADRAO, novaAltura);
    
    return canvasFinal.toDataURL("image/jpeg", 0.95);
  };

  const handleExportarJpeg = async () => {
    try {
      setExportando(true);
      const dataUrl = await exportarGraficoComoJpeg();
      const link = document.createElement("a");
      const genero = sexo === "F" ? "meninas" : "meninos";
      link.href = dataUrl;
      link.download = `grafico-crescimento-${genero}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Gráfico exportado como JPEG.");
    } catch (error) {
      console.error("Erro ao exportar gráfico:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar o gráfico."
      );
    } finally {
      setExportando(false);
    }
  };

  // Largura padrão para exportação (ideal para documentos Word A4)
  const LARGURA_EXPORTACAO = 1400; // pixels - largura maior para melhor visualização

  // Função auxiliar para capturar elemento como canvas com largura fixa
  const capturarElementoComoCanvas = async (elemento: HTMLElement): Promise<HTMLCanvasElement> => {
    const html2canvas = (await import('html2canvas')).default;
    
    // Captura o elemento com escala 2 para melhor qualidade
    const canvasOriginal = await html2canvas(elemento, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    // Calcular altura proporcional mantendo a proporção
    const proporcao = canvasOriginal.height / canvasOriginal.width;
    const novaLargura = LARGURA_EXPORTACAO;
    const novaAltura = Math.round(novaLargura * proporcao);
    
    // Criar canvas com dimensões padronizadas
    const canvasRedimensionado = document.createElement('canvas');
    canvasRedimensionado.width = novaLargura;
    canvasRedimensionado.height = novaAltura;
    
    const ctx = canvasRedimensionado.getContext('2d');
    if (!ctx) {
      throw new Error('Não foi possível criar contexto 2D');
    }
    
    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, novaLargura, novaAltura);
    
    // Desenhar imagem redimensionada com suavização
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvasOriginal, 0, 0, novaLargura, novaAltura);
    
    return canvasRedimensionado;
  };

  // Exportar card completo como JPEG (download)
  const handleExportarCardCompleto = async () => {
    if (!cardCompletoRef.current) {
      toast.error("Não foi possível encontrar o card para exportar.");
      return;
    }

    try {
      setExportandoCard(true);
      const canvas = await capturarElementoComoCanvas(cardCompletoRef.current);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      
      const link = document.createElement("a");
      const nomeArquivo = nomeCrianca 
        ? `evolucao-nutricional-${nomeCrianca.toLowerCase().replace(/\s+/g, '-')}.jpg`
        : `evolucao-nutricional.jpg`;
      link.href = dataUrl;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Card exportado como JPEG.");
    } catch (error) {
      console.error("Erro ao exportar card:", error);
      toast.error("Não foi possível exportar o card.");
    } finally {
      setExportandoCard(false);
    }
  };

  // Copiar card completo para área de transferência
  const handleCopiarParaClipboard = async () => {
    if (!cardCompletoRef.current) {
      toast.error("Não foi possível encontrar o card para copiar.");
      return;
    }

    try {
      setCopiando(true);
      const canvas = await capturarElementoComoCanvas(cardCompletoRef.current);
      
      // Converter canvas para blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Falha ao criar blob da imagem"));
          }
        }, "image/png");
      });

      // Copiar para clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      
      toast.success("Imagem copiada para a área de transferência!");
    } catch (error) {
      console.error("Erro ao copiar para clipboard:", error);
      toast.error("Não foi possível copiar. Verifique as permissões do navegador.");
    } finally {
      setCopiando(false);
    }
  };

  const cores = CORES_SEXO[sexo as "M" | "F"] || CORES_SEXO.M;

  return (
    <div className="space-y-6">
      {/* Barra de Ferramentas de Exportação */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">Exportar:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportarJpeg}
              disabled={exportando}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Baixar apenas o gráfico como imagem JPEG"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {exportando ? "Exportando..." : "Gráfico"}
            </button>
            <button
              onClick={handleExportarCardCompleto}
              disabled={exportandoCard}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Baixar o card completo como imagem JPEG"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportandoCard ? "Exportando..." : "Card Completo"}
            </button>
            <button
              onClick={handleCopiarParaClipboard}
              disabled={copiando}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Copiar o card completo para a área de transferência"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiando ? "Copiando..." : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      {/* Card Completo - usado para exportação */}
      <div ref={cardCompletoRef} className="space-y-6 bg-white">
        {/* Seção 1: EVOLUÇÃO NUTRIÇÃO - Dados do RN */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div 
            className="px-6 py-4 border-b-2"
            style={{ backgroundColor: cores.primaria, borderColor: cores.secundaria }}
          >
            <h2 className="text-lg font-bold text-white tracking-wide">EVOLUÇÃO NUTRIÇÃO</h2>
          </div>
        
        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Nome do RN */}
            {nomeCrianca && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Nome do RN</span>
                <p className="text-sm font-bold text-gray-900">{nomeCrianca}</p>
              </div>
            )}
            
            {/* Sexo */}
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Sexo</span>
              <p className="text-sm font-semibold text-gray-900">
                {sexo === "M" ? "Masculino" : "Feminino"}
            </p>
          </div>
            
            {/* Peso Nascimento */}
            {pesoNascimentoGr && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Peso Nascimento</span>
                <p className="text-sm font-semibold text-gray-900">
                  {pesoNascimentoGr.toLocaleString("pt-BR")} g
                </p>
          </div>
            )}
            
            {/* Peso Atual */}
            {pesoAtualInfo && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Peso Atual</span>
                <p className="text-sm font-semibold text-gray-900">
                  {Math.round(pesoAtualInfo.pesoGr).toLocaleString("pt-BR")} g
                  <span className={`ml-2 text-xs font-bold ${pesoAtualInfo.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({pesoAtualInfo.diferenca >= 0 ? '+' : ''}{Math.round(pesoAtualInfo.diferenca)} g)
                </span>
                </p>
              </div>
            )}
            
            {/* IG Nascimento */}
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">IG Nascimento</span>
              <p className="text-sm font-semibold text-gray-900">
                {idadeGestacionalSemanas} sem{idadeGestacionalDias ? ` e ${idadeGestacionalDias} dia${idadeGestacionalDias > 1 ? 's' : ''}` : ''}
              </p>
                </div>
            
            {/* IGC Atual */}
            {ehPretermo && calcularIGCAtual && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">IGC (Atual)</span>
                <p className="text-sm font-semibold text-indigo-700">
                  {calcularIGCAtual.semanas} sem{calcularIGCAtual.dias > 0 ? ` e ${calcularIGCAtual.dias} dia${calcularIGCAtual.dias > 1 ? 's' : ''}` : ''}
                </p>
              </div>
            )}
            
            {/* Idade Cronológica */}
            {calcularIdadeCronologica !== null && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Idade Cronológica</span>
                <p className="text-sm font-semibold text-gray-900">
                  {calcularIdadeCronologica} dia{calcularIdadeCronologica !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            
            {/* Tipo de Parto */}
            {tipoParto && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Parto</span>
                <p className="text-sm font-semibold text-gray-900">{tipoParto}</p>
              </div>
            )}
            
            {/* Apgar */}
            {(apgar1Minuto !== undefined || apgar5Minuto !== undefined) && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Apgar</span>
                <p className="text-sm font-semibold text-gray-900">
                  {apgar1Minuto ?? '-'}/{apgar5Minuto ?? '-'}
                </p>
              </div>
            )}
            
            {/* Estatura ao Nascer */}
            {comprimentoCm && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Estatura ao Nascer</span>
                <p className="text-sm font-semibold text-gray-900">
                  {comprimentoCm.toFixed(1).replace('.', ',')} cm
                </p>
              </div>
            )}
            
            {/* PC ao Nascer */}
            {perimetroCefalicoNascimentoCm && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">PC ao Nascer</span>
                <p className="text-sm font-semibold text-gray-900">
                  {perimetroCefalicoNascimentoCm.toFixed(1).replace('.', ',')} cm
                </p>
              </div>
            )}
          </div>
              </div>
            </div>
            
      {/* Seção 2: CURVAS DE CRESCIMENTO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div 
          className="px-6 py-4 border-b-2"
          style={{ backgroundColor: cores.primaria + '10', borderColor: cores.primaria }}
        >
          <h3 className="text-lg font-bold" style={{ color: cores.primaria }}>
            CURVAS DE CRESCIMENTO
          </h3>
          <p className="text-xs text-gray-600 italic">
            {ehPretermo
              ? "INTERGROWTH-21st (idade pós-menstrual) até 64 semanas; depois OMS com idade corrigida"
              : "WHO Child Growth Standards"}
          </p>
            </div>
        
        <div className="p-3 sm:p-6">
          {/* Dados de nascimento resumidos */}
          <div className="flex flex-wrap gap-6 mb-6 pb-4 border-b border-gray-200">
            {pesoNascimentoGr && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">PESO NASCER:</span>
                <span className="text-sm font-bold" style={{ color: cores.primaria }}>
                  {(pesoNascimentoGr / 1000).toFixed(3).replace('.', ',')} kg / {idadeGestacionalSemanas}S {idadeGestacionalDias || 0}D
                </span>
          </div>
            )}
            {comprimentoCm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">ESTATURA:</span>
                <span className="text-sm font-bold" style={{ color: cores.primaria }}>
                  {comprimentoCm.toFixed(1).replace('.', ',')} cm
                </span>
              </div>
            )}
            {perimetroCefalicoNascimentoCm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">PC:</span>
                <span className="text-sm font-bold" style={{ color: cores.primaria }}>
                  {perimetroCefalicoNascimentoCm.toFixed(1).replace('.', ',')} cm
                </span>
              </div>
            )}
        </div>
        <div ref={areaGraficoRef}>
        {ehPretermo && (
          <GraficoIntergrowth sexo={sexo === "F" ? "F" : "M"} pontos={pontosIntergrowth} />
        )}
        {mostrarGraficoOms && (
          <div className={ehPretermo ? "mt-6 pt-6 border-t border-gray-200" : ""}>
            {ehPretermo && (
              <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                Após 64 semanas pós-menstruais — OMS (idade corrigida até {" "}
                24 meses, depois cronológica)
              </h4>
            )}
            <GraficoOms sexo={sexo === "F" ? "F" : "M"} pontos={pontosOms} />
            <div className="mt-6">
              <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                Estado nutricional — peso para comprimento/estatura
              </h4>
              <GraficoPesoEstatura sexo={sexo === "F" ? "F" : "M"} pontos={pontosPesoEstatura} />
            </div>
          </div>
        )}
        </div>
        
        {/* Tabela de Histórico de Peso */}
        {historicoConsultas.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              Histórico de medidas
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Semanas</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Dias</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Peso (kg)</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Comprimento (cm)</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">PC (cm)</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Z peso / comp. / PC</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoConsultas.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-900 font-medium">{item.igcSemanas}</td>
                      <td className="px-3 py-2 text-gray-900">{item.igcDias}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold">
                        {item.pesoKg.toFixed(3).replace('.', ',')}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {item.estaturaCm ? item.estaturaCm.toFixed(1).replace('.', ',') : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {item.perimetroCefalicoCm ? item.perimetroCefalicoCm.toFixed(1).replace('.', ',') : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">
                        {formatarZ(item.zScorePeso)} / {formatarZ(item.zScoreAltura)} / {formatarZ(item.zScorePerimetro)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {item.data.toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Seção 3: NECESSIDADES NUTRICIONAIS E DIETOTERAPIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div 
          className="px-6 py-4 border-b-2"
          style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}
        >
          <h3 className="text-lg font-bold text-amber-800">NECESSIDADES NUTRICIONAIS</h3>
        </div>
        
        <div className="p-3 sm:p-6">
          {dietaAtual && totaisDieta ? (
            <>
              {/* Parâmetros definidos pelo profissional */}
              {(totaisDieta.taxaEnergetica || totaisDieta.metaProteica) && (
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="text-sm font-bold text-amber-800 mb-3">Parâmetros Nutricionais (Definidos pelo Profissional)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {totaisDieta.taxaEnergetica && (
                      <div>
                        <span className="text-xs text-amber-600">Taxa Energética</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.taxaEnergetica} kcal/kg/dia</p>
                      </div>
                    )}
                    {totaisDieta.metaProteica && (
                      <div>
                        <span className="text-xs text-amber-600">Meta Proteica</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.metaProteica} g/kg/dia</p>
                      </div>
                    )}
                    {totaisDieta.pesoReferencia && (
                      <div>
                        <span className="text-xs text-amber-600">Peso Referência</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.pesoReferencia.toFixed(3).replace('.', ',')} kg</p>
                      </div>
                    )}
                    {totaisDieta.viaAdministracao && (
                      <div>
                        <span className="text-xs text-amber-600">Via</span>
                        <p className="text-sm font-bold text-amber-900">{totaisDieta.viaAdministracao}</p>
                      </div>
                    )}
                  </div>
                  {/* Necessidades calculadas */}
                  {(totaisDieta.necessidadeEnergetica || totaisDieta.necessidadeProteica) && (
                    <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 gap-4">
                      {totaisDieta.necessidadeEnergetica && (
                        <div>
                          <span className="text-xs text-amber-600">Necessidade Energética</span>
                          <p className="text-lg font-bold text-amber-900">
                            {totaisDieta.necessidadeEnergetica.toFixed(1).replace('.', ',')} kcal/dia
                          </p>
                        </div>
                      )}
                      {totaisDieta.necessidadeProteica && (
                        <div>
                          <span className="text-xs text-amber-600">Necessidade Proteica</span>
                          <p className="text-lg font-bold text-amber-900">
                            {totaisDieta.necessidadeProteica.toFixed(2).replace('.', ',')} g/dia
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fornecido pela Dieta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Energia Diária Fornecida */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <span className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Energia Fornecida</span>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-blue-800">
                      {totaisDieta.energiaDiaria.toFixed(2).replace('.', ',')} kcal/dia
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      {totaisDieta.energiaKgDia.toFixed(1).replace('.', ',')} kcal/kg/dia
                    </p>
                    {totaisDieta.adequacaoEnergia !== null && (
                      <p className={`text-sm font-bold mt-2 ${totaisDieta.adequacaoEnergia >= 90 ? 'text-green-600' : totaisDieta.adequacaoEnergia >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        Adequação: {totaisDieta.adequacaoEnergia.toFixed(1).replace('.', ',')}%
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Proteína Diária Fornecida */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <span className="text-xs text-green-600 uppercase tracking-wide font-semibold">Proteína Fornecida</span>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-green-800">
                      {totaisDieta.proteinaDiaria.toFixed(2).replace('.', ',')} g/dia
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {totaisDieta.proteinaKgDia.toFixed(2).replace('.', ',')} g/kg/dia
                    </p>
                    {totaisDieta.adequacaoProteina !== null && (
                      <p className={`text-sm font-bold mt-2 ${totaisDieta.adequacaoProteina >= 90 ? 'text-green-600' : totaisDieta.adequacaoProteina >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        Adequação: {totaisDieta.adequacaoProteina.toFixed(1).replace('.', ',')}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            
            {/* Detalhes da Dietoterapia */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Dietoterapia</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="text-xs text-gray-500">Via</span>
                  <p className="text-sm font-semibold text-gray-900">{totaisDieta.viaAdministracao || 'Enteral'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Frequência</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {dietaAtual.frequenciaHoras}h/{dietaAtual.frequenciaHoras}h
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Mamadas/dia</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {totaisDieta.frequenciaDia.toFixed(0)}x
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Início</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(dietaAtual.dataInicio).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              {/* Itens da dieta */}
              {dietaAtual.itens && dietaAtual.itens.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Composição</span>
                  <div className="mt-2 space-y-2">
                    {dietaAtual.itens.map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">
                          {item.alimento?.nome || 'Alimento'}
                        </span>
                        <span className="text-gray-600">
                          {item.quantidade} {item.alimento?.unidade || 'ml'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Tabela de Energia/Proteína da Dieta */}
            <div className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700"></th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Por Mamada</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Por Dia</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Por kg/dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 font-semibold text-gray-700">Energia (kcal)</td>
                      <td className="px-4 py-3 text-center text-gray-900">
                        {totaisDieta.energiaPorMamada.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 font-semibold">
                        {totaisDieta.energiaDiaria.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${totaisDieta.energiaKgDia >= 110 ? 'text-green-600' : totaisDieta.energiaKgDia >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                          {totaisDieta.energiaKgDia.toFixed(1).replace('.', ',')}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-700">Proteína (g)</td>
                      <td className="px-4 py-3 text-center text-gray-900">
                        {totaisDieta.proteinaPorMamada.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 font-semibold">
                        {totaisDieta.proteinaDiaria.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${totaisDieta.proteinaKgDia >= 3.5 ? 'text-green-600' : totaisDieta.proteinaKgDia >= 2.5 ? 'text-amber-600' : 'text-red-600'}`}>
                          {totaisDieta.proteinaKgDia.toFixed(2).replace('.', ',')}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Legenda de cores */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  <span className="text-gray-600">Adequado</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span className="text-gray-600">Atenção</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  <span className="text-gray-600">Inadequado</span>
                </div>
              </div>
            </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Nenhuma dietoterapia cadastrada</p>
              <p className="text-sm text-gray-400 mt-1">Cadastre uma dieta para visualizar as necessidades nutricionais</p>
            </div>
          )}
        </div>
      </div>
      </div>
      {/* Fim do Card Completo para exportação */}

      {/* Seção de Interpretação do Gráfico */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Como Interpretar o Gráfico</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">Z-Scores e Percentis</h5>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Z 0 (P50):</strong> Mediana - 50% das crianças estão acima e 50% abaixo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-900 font-bold">•</span>
                <span><strong>Z-1 a Z+1 (P15,9 a P84,1):</strong> Faixa normal - crescimento adequado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span><strong>Z-2 a Z-1 / Z+1 a Z+2:</strong> Atenção - monitorar crescimento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>Z-3 ou Z+3:</strong> Alerta - avaliação imediata necessária</span>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">Avaliação do Crescimento</h5>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Trajetória:</strong> Observe se os pontos seguem uma curva paralela às curvas de referência</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Cruzamento de curvas:</strong> Mudanças bruscas podem indicar problemas de crescimento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Velocidade:</strong> O crescimento deve ser contínuo e proporcional</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Consistência:</strong> Manter-se na mesma faixa Z-score indica crescimento adequado</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-primary/5 border-l-4 border-primary rounded">
          <p className="text-sm text-gray-700">
            <strong>Importante:</strong> Este gráfico é uma ferramenta de acompanhamento. 
            Qualquer preocupação com o crescimento deve ser avaliada por um profissional de saúde qualificado.
          </p>
        </div>
      </div>
    </div>
  );
}
