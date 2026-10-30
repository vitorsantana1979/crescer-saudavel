#!/usr/bin/env python3
"""
Mock da API para desenvolver e capturar telas do frontend sem o backend .NET/SQL Server.

Serve, com as mesmas fórmulas e o mesmo formato (camelCase) do backend:
- curvas de referência (OMS diária, INTERGROWTH semanal, peso para comprimento/estatura);
- avaliação de tamanho ao nascer (PIG/AIG/GIG);
- um conjunto de demonstração com duas crianças fictícias (demo_dados.py): cadastro, atendimentos
  com z/classificação/alertas, dieta e ganho para manter o canal.

Não valida token nem grava nada. Escuta só em localhost.

Uso:
  python3 scripts/mock_api/mock_api.py [porta]          # padrão 5280 (o proxy do Vite aponta para lá)
Depois, no `vite dev`: /dev/grafico-oms, /dev/vitrine?item=..., /dev/entrar-demo?para=/criancas/detalhes/demo-helena
"""
import json
import math
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from statistics import NormalDist
from urllib.parse import parse_qs, urlparse

AQUI = Path(__file__).resolve().parent
REFERENCIAS = AQUI.parent.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias"
PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 5280

sys.path.insert(0, str(AQUI))
import demo_dados  # noqa: E402

REFS = demo_dados.Referencias(REFERENCIAS)
DEMO = demo_dados.montar(REFS)
ND = NormalDist()
LINHAS_Z = (("zN3", -3), ("zN2", -2), ("zN1", -1), ("z0", 0), ("zP1", 1), ("zP2", 2), ("zP3", 3))
# Nós do tamanho ao nascer: linhas z e centis publicados (como TamanhoNascimentoService)
NOS_NASCIMENTO = [(z, k) for k, z in LINHAS_Z] + [
    (ND.inv_cdf(p / 100), k) for p, k in ((3, "p3"), (5, "p5"), (10, "p10"), (90, "p90"), (95, "p95"), (97, "p97"))
]

ROTA_OMS = re.compile(r"^/api/referencias/oms/(peso|estatura|perimetro|imc)/([fm])/curva-diaria$")
ROTA_PE = re.compile(r"^/api/referencias/oms/peso-estatura/(comprimento|altura)/([fm])/curva$")
ROTA_IG = re.compile(r"^/api/referencias/intergrowth/(peso|estatura|perimetro)/([fm])/curvas$", re.IGNORECASE)

_cache = {}


def json_ref(*partes):
    chave = "/".join(partes)
    if chave not in _cache:
        _cache[chave] = json.loads((REFERENCIAS.joinpath(*partes)).read_text())
    return _cache[chave]


def linhas_lms(p):
    return {k: round(demo_dados.valor_lms(p["l"], p["m"], p["s"], z), 3) for k, z in LINHAS_Z}


def avaliar_nascimento(medida, sexo, ig, valor):
    linha = {p["igDias"]: p for p in json_ref("INTERGROWTH", f"nascimento_{medida}_{sexo}.json")}.get(ig)
    if not linha or not valor or valor <= 0:
        return None
    nos = sorted((z, linha[k]) for z, k in NOS_NASCIMENTO)
    i = 0
    while i < len(nos) - 2 and valor > nos[i + 1][1]:
        i += 1
    (z0, v0), (z1, v1) = nos[i], nos[i + 1]
    z = z0 if valor == v0 else z1 if valor == v1 else z0 + (valor - v0) / (v1 - v0) * (z1 - z0)
    p10 = ND.inv_cdf(0.10)
    return {"z": round(z, 2), "percentil": round(ND.cdf(z) * 100, 1),
            "adequacao": "PIG" if z < p10 else "GIG" if z > -p10 else "AIG", "padrao": ig >= 231}


def nascimento(qs):
    g = lambda k: (qs.get(k) or [None])[0]  # noqa: E731
    sexo = (g("sexo") or "f")[0].lower()
    sem = float(g("igSemanas"))
    dias = g("igDias")
    ig = int(sem) * 7 + (int(dias) if dias is not None else round((sem - int(sem)) * 7))
    dentro = 168 <= ig <= 300
    f = lambda k: float(g(k)) if g(k) else None  # noqa: E731
    peso = f("pesoGr")
    return {"idadeGestacionalDias": ig, "dentroDaFaixa": dentro, "padrao": (ig >= 231) if dentro else None,
            "peso": avaliar_nascimento("peso", sexo, ig, peso / 1000) if peso else None,
            "comprimento": avaliar_nascimento("estatura", sexo, ig, f("comprimentoCm")),
            "perimetroCefalico": avaliar_nascimento("perimetro", sexo, ig, f("perimetroCefalicoCm"))}


def responder(caminho, query):
    if caminho == "/api/health":
        return {"ok": True}
    if m := ROTA_OMS.match(caminho):
        return [{"dia": p["dia"], **linhas_lms(p)} for p in json_ref("OMS", f"{m[1]}_{m[2]}.json")]
    if m := ROTA_PE.match(caminho):
        arquivo = "peso_comprimento" if m[1] == "comprimento" else "peso_altura"
        tabela = json_ref("OMS", f"{arquivo}_{m[2]}.json")
        return [{"cm": p["cm"], **linhas_lms(p)} for i, p in enumerate(tabela) if i % 5 == 0]
    if m := ROTA_IG.match(caminho):
        tabela = json_ref("INTERGROWTH", f"{m[1].lower()}_{m[2].lower()}.json")
        return [{"semanas": p["semana"], **{k: p[k] for k, _ in LINHAS_Z}} for p in tabela]
    if caminho == "/api/referencias/nascimento/avaliar":
        return nascimento(query)
    if caminho == "/api/recemnascido":
        return list(DEMO["criancas"].values())
    if (m := re.match(r"^/api/recemnascido/([^/]+)$", caminho)) and m[1] in DEMO["criancas"]:
        return DEMO["criancas"][m[1]]
    if (m := re.match(r"^/api/consultas/crianca/([^/]+)$", caminho)) and m[1] in DEMO["atendimentos"]:
        return DEMO["atendimentos"][m[1]]
    if (m := re.match(r"^/api/dietas/crianca/([^/]+)$", caminho)) and m[1] in DEMO["dietas"]:
        return DEMO["dietas"][m[1]]
    if m := re.match(r"^/api/consultas/(demo-[a-z]+)-a(\d+)/ganho-esperado$", caminho):
        atendimento = next((a for a in DEMO["atendimentos"].get(m[1], []) if a["id"] == f"{m[1]}-a{m[2]}"), None)
        if atendimento:
            return demo_dados.ganho_esperado(REFS, DEMO["criancas"][m[1]], atendimento)
    return None


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        dados = responder(url.path, parse_qs(url.query))
        corpo = json.dumps(dados if dados is not None else {"message": "mock: rota inexistente"}).encode()
        self.send_response(200 if dados is not None else 404)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self):  # preflight CORS (o frontend manda Authorization)
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("[mock] " + fmt % args + "\n")


if __name__ == "__main__":
    print(f"mock da API em http://localhost:{PORTA} (referências: {REFERENCIAS})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORTA), Handler).serve_forever()
