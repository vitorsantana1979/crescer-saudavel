"""Conjunto de demonstração para o mock (scripts/mock_api/mock_api.py): duas crianças fictícias com atendimentos calculados pelas
mesmas regras do backend (seleção de referência, z por LMS/INTERGROWTH, classificação MS, alertas, VGP,
IMC e P/E). Só para telas de desenvolvimento e capturas da apresentação — não são dados reais."""
import json
import math
from datetime import date, datetime, timedelta
from pathlib import Path
from statistics import NormalDist

ND = NormalDist()


class Referencias:
    def __init__(self, base: Path):
        self.base = base
        self.oms = {}
        self.ig = {}
        self.pe = {}

    def tabela_oms(self, medida, sexo):
        k = f"{medida}_{sexo}"
        if k not in self.oms:
            self.oms[k] = json.loads((self.base / "OMS" / f"{k}.json").read_text())
        return self.oms[k]

    def tabela_ig(self, medida, sexo):
        k = f"{medida}_{sexo}"
        if k not in self.ig:
            self.ig[k] = {p["semana"]: p for p in json.loads((self.base / "INTERGROWTH" / f"{k}.json").read_text())}
        return self.ig[k]

    def tabela_pe(self, deitado, sexo):
        k = f"{'peso_comprimento' if deitado else 'peso_altura'}_{sexo}"
        if k not in self.pe:
            self.pe[k] = json.loads((self.base / "OMS" / f"{k}.json").read_text())
        return self.pe[k]


def valor_lms(l, m, s, z):
    return m * math.exp(s * z) if abs(l) < 1e-9 else m * (1 + l * s * z) ** (1 / l)


def z_lms(v, l, m, s, caudas):
    z = math.log(v / m) / s if abs(l) < 1e-9 else ((v / m) ** l - 1) / (l * s)
    if caudas and z > 3:
        sd3, sd2 = valor_lms(l, m, s, 3), valor_lms(l, m, s, 2)
        return 3 + (v - sd3) / (sd3 - sd2)
    if caudas and z < -3:
        sd3, sd2 = valor_lms(l, m, s, -3), valor_lms(l, m, s, -2)
        return -3 + (v - sd3) / (sd2 - sd3)
    return z


K = ["zN3", "zN2", "zN1", "z0", "zP1", "zP2", "zP3"]


def linhas_ig(tab, semanas):
    a = tab[math.floor(semanas)]
    b = tab.get(math.floor(semanas) + 1, a)
    f = semanas - math.floor(semanas)
    return [a[k] + (b[k] - a[k]) * f for k in K]


def z_ig(v, vs):
    zs = [-3, -2, -1, 0, 1, 2, 3]
    if v <= vs[0]:
        return -3 + (v - vs[0]) / (vs[1] - vs[0])
    if v >= vs[6]:
        return 3 + (v - vs[6]) / (vs[6] - vs[5])
    for i in range(6):
        if v <= vs[i + 1]:
            return zs[i] + (v - vs[i]) / (vs[i + 1] - vs[i])


def valor_ig(z, vs):
    if z <= -3:
        return vs[0] + (z + 3) * (vs[1] - vs[0])
    if z >= 3:
        return vs[6] + (z - 3) * (vs[6] - vs[5])
    i = min(math.floor(z + 3), 5)
    return vs[i] + (z + 3 - i) * (vs[i + 1] - vs[i])


def classif(indicador, z):
    if z is None:
        return None
    if indicador == "peso":
        return ("PesoMuitoBaixo" if z < -3 else "PesoBaixo" if z < -2 else "PesoVigilanciaBaixo" if z < -1
                else "PesoAdequado" if z <= 1 else "PesoVigilanciaElevado" if z <= 2 else "PesoElevado")
    if indicador == "estatura":
        return "EstaturaMuitoBaixa" if z < -3 else "EstaturaBaixa" if z < -2 else "EstaturaAdequada"
    if indicador == "perimetro":
        return "PerimetroCefalicoAbaixo" if z < -2 else "PerimetroCefalicoAdequado" if z <= 2 else "PerimetroCefalicoAcima"
    p = "Imc" if indicador == "imc" else "PesoEstatura"
    return p + ("MagrezaAcentuada" if z < -3 else "Magreza" if z < -2 else "Eutrofia" if z <= 1
                else "RiscoSobrepeso" if z <= 2 else "Sobrepeso" if z <= 3 else "Obesidade")


def selecionar(crianca, data):
    nasc = date.fromisoformat(crianca["dataNascimento"][:10])
    crono = (data - nasc).days
    ig = math.floor(crianca["idadeGestacionalSemanas"]) * 7 + (crianca.get("idadeGestacionalDias") or 0)
    if crianca["idadeGestacionalSemanas"] >= 37:
        return "OMS", crono, "Cronologica"
    pm = ig + crono
    if pm <= 64 * 7:
        return "INTERGROWTH", pm, "PosMenstrual"
    corr = pm - 280
    return ("OMS", corr, "Corrigida") if corr <= math.ceil(24 * 30.4375) else ("OMS", crono, "Cronologica")


def interp(pontos, x):
    """Interpolação linear em uma trajetória [(x, z)]."""
    if x <= pontos[0][0]:
        return pontos[0][1]
    for (x0, z0), (x1, z1) in zip(pontos, pontos[1:]):
        if x <= x1:
            return z0 + (z1 - z0) * (x - x0) / (x1 - x0)
    return pontos[-1][1]


def atendimentos(refs, crianca, datas, traj_peso, traj_est, traj_pc, eixo):
    sexo = crianca["sexo"].lower()
    lista, anterior = [], None
    for i, (dt, hora) in enumerate(datas):
        ref, idade, tipo = selecionar(crianca, dt)
        x = idade / 7 if eixo == "semanas_pm" else (dt - date.fromisoformat(crianca["dataNascimento"][:10])).days
        zp, ze, zc = interp(traj_peso, x), interp(traj_est, x), interp(traj_pc, x)
        if ref == "INTERGROWTH":
            s = idade / 7
            peso = round(valor_ig(zp, linhas_ig(refs.tabela_ig("peso", sexo), s)), 3)
            est = round(valor_ig(ze, linhas_ig(refs.tabela_ig("estatura", sexo), s)), 1)
            pc = round(valor_ig(zc, linhas_ig(refs.tabela_ig("perimetro", sexo), s)), 1)
            zpeso = z_ig(peso, linhas_ig(refs.tabela_ig("peso", sexo), s))
            zest = z_ig(est, linhas_ig(refs.tabela_ig("estatura", sexo), s))
            zpc = z_ig(pc, linhas_ig(refs.tabela_ig("perimetro", sexo), s))
            zimc = zpe = None
        else:
            lms = lambda m: refs.tabela_oms(m, sexo)[idade]
            p, e, c = lms("peso"), lms("estatura"), lms("perimetro")
            peso = round(valor_lms(p["l"], p["m"], p["s"], zp), 3)
            est = round(valor_lms(e["l"], e["m"], e["s"], ze), 1)
            pc = round(valor_lms(c["l"], c["m"], c["s"], zc), 1)
            zpeso = z_lms(peso, p["l"], p["m"], p["s"], True)
            zest = z_lms(est, e["l"], e["m"], e["s"], False)
            zpc = z_lms(pc, c["l"], c["m"], c["s"], False)
            imc_v = peso / (est / 100) ** 2
            b = lms("imc")
            zimc = z_lms(imc_v, b["l"], b["m"], b["s"], True)
            deitado = idade < 731
            tab = refs.tabela_pe(deitado, sexo)
            mn = 45.0 if deitado else 65.0
            j = min(max(round((est - mn) * 10), 0), len(tab) - 1)
            zpe = z_lms(peso, tab[j]["l"], tab[j]["m"], tab[j]["s"], True)
        r2 = lambda z: None if z is None else round(z, 2)
        zpeso, zest, zpc, zimc, zpe = map(r2, (zpeso, zest, zpc, zimc, zpe))
        vgp = None
        if anterior:
            dias = (dt - date.fromisoformat(anterior["dataHora"][:10])).days
            if dias > 0:
                vgp = round(1000 * math.log(peso / anterior["pesoKg"]) / dias, 1)
        a = {
            "id": f"{crianca['id']}-a{i + 1:02d}",
            "recemNascidoId": crianca["id"],
            "dataHora": datetime.combine(dt, hora).isoformat(),
            "pesoKg": peso, "estaturaCm": est, "perimetroCefalicoCm": pc,
            "zScorePeso": zpeso, "zScoreAltura": zest, "zScorePerimetro": zpc,
            "referenciaCurva": ref, "idadeCalculoDias": idade, "tipoIdadeCalculo": tipo,
            "classificacaoPeso": classif("peso", zpeso), "classificacaoEstatura": classif("estatura", zest),
            "classificacaoPerimetro": classif("perimetro", zpc),
            "imc": round(peso / (est / 100) ** 2, 2), "zScoreImc": zimc, "zScorePesoEstatura": zpe,
            "classificacaoImc": classif("imc", zimc), "classificacaoPesoEstatura": classif("pe", zpe),
            "posicaoMedida": None, "velocidadeGanhoPonderal": vgp,
            "alertaRCEU": ref == "INTERGROWTH" and zpeso is not None and zpeso <= -1.28,
            "alertaQuedaPonderal": bool(anterior and anterior["zScorePeso"] is not None and zpeso is not None
                                        and anterior["referenciaCurva"] == ref and zpeso - anterior["zScorePeso"] <= -0.5),
        }
        lista.append(a)
        anterior = a
    return lista


def montar(refs):
    from datetime import time
    helena = {
        "id": "demo-helena", "nome": "Helena (demonstração)", "sexo": "F",
        "dataNascimento": "2026-01-05T00:00:00", "horaNascimento": "10:40:00",
        "idadeGestacionalSemanas": 30, "idadeGestacionalDias": 2, "metodoIG": "USG",
        "dataUltimaMenstruacao": "2025-06-07T00:00:00", "dataProvavelParto": "2026-03-14T00:00:00",
        "tipoParto": "Cesáreo", "apgar1Minuto": 6, "apgar5Minuto": 8,
        "pesoNascimentoGr": 1180, "comprimentoCm": 38.5, "perimetroCefalicoCm": 27.6,
        "classificacaoIG": "RNPTM", "classificacaoPN": "Muito Baixo Peso",
    }
    nasc = date(2026, 1, 5)
    datas = [(nasc + timedelta(days=d), time(9, 30)) for d in (3, 10, 17, 24, 31, 38, 45, 52, 59, 66, 80, 94, 115, 136, 157)]
    datas += [(nasc + timedelta(days=d), time(10, 0)) for d in (190, 220, 250, 280)]
    # z ao longo da idade pós-menstrual (semanas): queda abaixo do P10 por volta de 35 s (RCEU) e recuperação
    traj_peso = [(30, -0.25), (31.5, -0.75), (33.5, -1.2), (35.5, -1.45), (37.5, -1.15), (40, -0.85), (46, -0.6), (55, -0.45), (64, -0.4), (70, -0.35), (80, -0.3)]
    traj_est = [(30, -0.4), (34, -0.8), (38, -0.95), (44, -0.8), (55, -0.6), (64, -0.55), (80, -0.45)]
    traj_pc = [(30, -0.1), (34, -0.35), (38, -0.2), (44, 0.05), (64, 0.15), (80, 0.2)]
    a_helena = atendimentos(refs, helena, datas, traj_peso, traj_est, traj_pc, "semanas_pm")

    miguel = {
        "id": "demo-miguel", "nome": "Miguel (demonstração)", "sexo": "M",
        "dataNascimento": "2024-06-10T00:00:00", "horaNascimento": "22:15:00",
        "idadeGestacionalSemanas": 39, "idadeGestacionalDias": 4, "metodoIG": "DUM",
        "dataUltimaMenstruacao": "2023-09-07T00:00:00", "dataProvavelParto": "2024-06-13T00:00:00",
        "tipoParto": "Normal", "apgar1Minuto": 9, "apgar5Minuto": 10,
        "pesoNascimentoGr": 3420, "comprimentoCm": 50.0, "perimetroCefalicoCm": 34.6,
        "classificacaoIG": "RNT", "classificacaoPN": "Peso Adequado",
    }
    n2 = date(2024, 6, 10)
    datas2 = [(n2 + timedelta(days=d), time(14, 0)) for d in (5, 30, 61, 122, 183, 274, 365, 456, 548, 640, 731, 820)]
    # dias de vida: ganho de peso acima do canal depois do 1º ano (risco de sobrepeso)
    t2p = [(0, 0.2), (180, 0.3), (365, 0.8), (548, 1.3), (820, 1.6)]
    t2e = [(0, 0.1), (365, 0.2), (820, 0.3)]
    t2c = [(0, 0.3), (820, 0.4)]
    a_miguel = atendimentos(refs, miguel, datas2, t2p, t2e, t2c, "dias")

    dieta = {
        "id": "demo-dieta-1", "recemNascidoId": "demo-helena", "dataInicio": "2026-01-20T00:00:00", "dataFim": None,
        "frequenciaHoras": 3, "taxaEnergeticaKcalKg": 130, "metaProteinaGKg": 3.8, "pesoReferenciaKg": None,
        "viaAdministracao": "Oral", "observacoes": "Leite materno com aditivo; reavaliar aditivo na alta.",
        "itens": [
            {"id": "i1", "alimentoId": "al1", "quantidade": 40, "energiaTotalKcal": 26.8, "proteinaTotalG": 0.44,
             "alimento": {"id": "al1", "nome": "Leite materno ordenhado", "categoria": "Leite", "unidade": "ml", "energiaKcalPor100": 67, "proteinaGPor100": 1.1}},
            {"id": "i2", "alimentoId": "al2", "quantidade": 1, "energiaTotalKcal": 3.5, "proteinaTotalG": 0.25,
             "alimento": {"id": "al2", "nome": "Aditivo do leite humano", "categoria": "Suplemento", "unidade": "sachê", "energiaKcalPor100": 350, "proteinaGPor100": 25}},
        ],
    }
    return {"criancas": {helena["id"]: helena, miguel["id"]: miguel},
            "atendimentos": {helena["id"]: a_helena, miguel["id"]: a_miguel},
            "dietas": {helena["id"]: [dieta], miguel["id"]: []}}


def ganho_esperado(refs, crianca, atendimento):
    sexo = crianca["sexo"].lower()
    ref, idade = atendimento["referenciaCurva"], atendimento["idadeCalculoDias"]
    h = 7 if ref == "INTERGROWTH" else 30
    h = min(h, (64 * 7 if ref == "INTERGROWTH" else 1856) - idade)
    saida = []
    for medida, nome, valor, z in (("peso", "peso", atendimento["pesoKg"], atendimento["zScorePeso"]),
                                   ("estatura", "estatura", atendimento["estaturaCm"], atendimento["zScoreAltura"]),
                                   ("perimetro", "perimetro", atendimento["perimetroCefalicoCm"], atendimento["zScorePerimetro"])):
        if z is None or h <= 0:
            continue
        if ref == "INTERGROWTH":
            esp = valor_ig(z, linhas_ig(refs.tabela_ig(medida, sexo), (idade + h) / 7))
        else:
            p = refs.tabela_oms(medida, sexo)[idade + h]
            esp = valor_lms(p["l"], p["m"], p["s"], z)
        casas = 3 if medida == "peso" else 1
        saida.append({"medida": nome, "referencia": ref, "horizonteDias": h, "z": z, "valorAtual": valor,
                      "valorEsperado": round(esp, casas), "ganho": round(esp - valor, casas),
                      "velocidadeGKgDia": round(1000 * math.log(esp / valor) / h, 1) if medida == "peso" else None})
    return saida
