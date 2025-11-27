using System.Text.Json;
using System.Text.Json.Serialization;

namespace CrescerSaudavel.Api.Services;

public class ZScoreService
{
    private readonly IWebHostEnvironment _env;
    private readonly Dictionary<string, List<RefPoint>> _cache = new();
    private readonly Dictionary<string, List<RefPointJson>> _cacheJson = new();
    private readonly Dictionary<string, List<WeightDataPoint>> _cacheWeightData = new();

    public record RefPoint(double IdadeSemanas, double Z, double Valor);
    
    // Estrutura para deserializar JSONs que podem ter idadeDias também
    private class RefPointJson
    {
        [JsonPropertyName("idadeSemanas")]
        public int IdadeSemanas { get; set; }
        
        [JsonPropertyName("idadeDias")]
        public int IdadeDias { get; set; }
        
        [JsonPropertyName("z")]
        public int Z { get; set; }
        
        [JsonPropertyName("valor")]
        public double Valor { get; set; }
    }

    // Estrutura para deserializar JSONs com formato weeks/days/z_-3, z_-2, etc
    private class WeightDataPoint
    {
        [JsonPropertyName("weeks")]
        public int Weeks { get; set; }
        
        [JsonPropertyName("days")]
        public int Days { get; set; }
        
        [JsonPropertyName("z_-3")]
        public double ZN3 { get; set; }
        
        [JsonPropertyName("z_-2")]
        public double ZN2 { get; set; }
        
        [JsonPropertyName("z_-1")]
        public double ZN1 { get; set; }
        
        [JsonPropertyName("z_0")]
        public double Z0 { get; set; }
        
        [JsonPropertyName("z_1")]
        public double ZP1 { get; set; }
        
        [JsonPropertyName("z_2")]
        public double ZP2 { get; set; }
        
        [JsonPropertyName("z_3")]
        public double ZP3 { get; set; }
    }

    public record CurvaReferencia(
        int Semanas,
        double ZN3,
        double ZN2,
        double ZN1,
        double Z0,
        double ZP1,
        double ZP2,
        double ZP3
    );

    public ZScoreService(IWebHostEnvironment env)
    {
        _env = env;
        LoadAll();
    }

    private void LoadAll()
    {
        string basePath = Path.Combine(_env.ContentRootPath, "Data", "Referencias");
        if (!Directory.Exists(basePath)) return;
        foreach (var dir in Directory.GetDirectories(basePath))
        {
            var tipo = Path.GetFileName(dir);
            foreach (var file in Directory.GetFiles(dir, "*.json"))
            {
                var key = $"{tipo}/{Path.GetFileNameWithoutExtension(file)}".ToLower();
                var json = File.ReadAllText(file);
                
                // Debug: log das chaves sendo carregadas
                if (file.Contains("peso_pretermo") || file.Contains("peso_padrao"))
                {
                    Console.WriteLine($"📦 Carregando arquivo: {file} -> chave: {key}");
                }
                
                // Verificar se o JSON contém o formato weeks/days/z_-3
                if (json.Contains("\"weeks\"") && json.Contains("\"z_-3\""))
                {
                    // Tentar deserializar com formato WeightDataPoint
                    try
                    {
                        var dataWeight = JsonSerializer.Deserialize<List<WeightDataPoint>>(json);
                        if (dataWeight != null && dataWeight.Count > 0)
                        {
                            _cacheWeightData[key] = dataWeight;
                            if (file.Contains("peso_pretermo") || file.Contains("peso_padrao"))
                            {
                                Console.WriteLine($"✅ Cache atualizado: {key} = {dataWeight.Count} pontos");
                            }
                            continue;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erro ao carregar arquivo WeightDataPoint {file}: {ex.Message}");
                    }
                }
                
                // Verificar se o JSON contém idadeDias
                if (json.Contains("\"idadeDias\""))
                {
                    // Tentar deserializar com idadeDias
                    try
                    {
                        var dataJson = JsonSerializer.Deserialize<List<RefPointJson>>(json);
                        if (dataJson != null && dataJson.Count > 0)
                        {
                            // Arquivo com idadeDias - guardar ambos
                            _cacheJson[key] = dataJson;
                            // Também manter compatibilidade com formato antigo
                            var data = dataJson.Select(p => new RefPoint(p.IdadeSemanas, p.Z, p.Valor)).ToList();
                            _cache[key] = data;
                            continue;
                        }
                    }
                    catch
                    {
                        // Se falhar, tenta formato antigo
                    }
                }
                
                // Fallback para formato antigo (sem idadeDias)
                try
                {
                    var data = JsonSerializer.Deserialize<List<RefPoint>>(json) ?? new();
                    _cache[key] = data;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erro ao carregar arquivo {file}: {ex.Message}");
                }
            }
        }
    }

    public double? CalcularZ(double idadeSemanas, double valor, string sexo, string tipo, string medida)
    {
        // Validação: para Intergrowth, IGC não pode ultrapassar 64 semanas
        if (tipo.Equals("INTERGROWTH", StringComparison.OrdinalIgnoreCase) && idadeSemanas > 64)
        {
            return null; // Retorna null se ultrapassar limite de 64 semanas de IGC
        }

        var key = $"{tipo}/{medida}_{sexo}".ToLower();
        if (!_cache.ContainsKey(key)) return null;

        var tabela = _cache[key];
        var pontos = tabela.Where(p => Math.Abs(p.IdadeSemanas - idadeSemanas) < 1).ToList();
        if (!pontos.Any()) return null;

        var refZero = pontos.FirstOrDefault(p => p.Z == 0);
        var refPlus1 = pontos.FirstOrDefault(p => p.Z == 1);
        var refMinus1 = pontos.FirstOrDefault(p => p.Z == -1);
        if (refZero == null || refPlus1 == null || refMinus1 == null) return null;

        var sd = (refPlus1.Valor - refMinus1.Valor) / 2;
        return Math.Round((valor - refZero.Valor) / sd, 2);
    }

    // Método para combinar arquivos de peso prematuro e padrão (masculino ou feminino)
    public List<CurvaReferencia>? ObterCurvasPesoCombinado(string sexo)
    {
        var keyPretermo = $"intergrowth/peso_pretermo_{sexo}".ToLower();
        var keyPadrao = $"intergrowth/peso_padrao_{sexo}".ToLower();

        List<WeightDataPoint>? dadosPretermo = null;
        List<WeightDataPoint>? dadosPadrao = null;

        if (_cacheWeightData.ContainsKey(keyPretermo))
        {
            dadosPretermo = _cacheWeightData[keyPretermo];
        }

        if (_cacheWeightData.ContainsKey(keyPadrao))
        {
            dadosPadrao = _cacheWeightData[keyPadrao];
        }

        if (dadosPretermo == null && dadosPadrao == null)
        {
            return null;
        }

        var todosDados = new List<WeightDataPoint>();
        
        // Dados de prematuros apenas para semanas < 37 (pré-termo)
        // Mas como temos dados padrão completos (0-64 semanas), vamos usar apenas dados padrão
        // para evitar conflitos e garantir continuidade
        if (dadosPadrao != null && dadosPadrao.Count > 0)
        {
            // Usar apenas dados padrão que têm dados completos até 64 semanas
            todosDados.AddRange(dadosPadrao);
        }
        else if (dadosPretermo != null)
        {
            // Fallback: usar dados pré-termo se não houver dados padrão
            var pretermoFiltrado = dadosPretermo.Where(p => p.Weeks < 37).ToList();
            todosDados.AddRange(pretermoFiltrado);
        }

        // Filtrar apenas pontos com days = 0 (início da semana) e agrupar por semana
        // Remover duplicatas mantendo apenas um ponto por semana (ordenado)
        var porSemana = todosDados
            .Where(p => p.Days == 0)
            .GroupBy(p => p.Weeks)
            .OrderBy(g => g.Key)
            .Select(g => g.First())  // Primeiro ponto de cada semana (garantir ordem consistente)
            .ToList();

        var curvas = new List<CurvaReferencia>();

        foreach (var ponto in porSemana)
        {
            curvas.Add(new CurvaReferencia(
                ponto.Weeks,
                ponto.ZN3,
                ponto.ZN2,
                ponto.ZN1,
                ponto.Z0,
                ponto.ZP1,
                ponto.ZP2,
                ponto.ZP3
            ));
        }

        return curvas;
    }

    public List<CurvaReferencia>? ObterCurvasPesoPretermo(string sexo)
    {
        // Para pré-termo INTERGROWTH: usar dados oficiais disponíveis em arquivo.
        // Permitimos retornar apenas a faixa 27-64 semanas quando o arquivo 27plus estiver presente.
        var keyPretermoFaixaCompleta = $"intergrowth/peso_pretermo_{sexo}".ToLower();
        var keyPretermo27Plus = $"intergrowth/peso_pretermo_{sexo}_27plus".ToLower();
        
        List<WeightDataPoint>? dadosPretermo = null;
        if (_cacheWeightData.ContainsKey(keyPretermo27Plus))
        {
            dadosPretermo = _cacheWeightData[keyPretermo27Plus];
        }
        else if (_cacheWeightData.ContainsKey(keyPretermoFaixaCompleta))
        {
            dadosPretermo = _cacheWeightData[keyPretermoFaixaCompleta];
        }
        
        if (dadosPretermo == null)
        {
            return null;
        }

        // Usar apenas pontos com days = 0 (início da semana) para manter um ponto por semana
        var dadosFiltrados = dadosPretermo
            .Where(p => p.Days == 0)
            .GroupBy(p => p.Weeks)
            .OrderBy(g => g.Key)
            .Select(g => g.First())
            .ToList();

        var curvas = new List<CurvaReferencia>();

        foreach (var ponto in dadosFiltrados)
        {
            curvas.Add(new CurvaReferencia(
                ponto.Weeks,
                ponto.ZN3,
                ponto.ZN2,
                ponto.ZN1,
                ponto.Z0,
                ponto.ZP1,
                ponto.ZP2,
                ponto.ZP3
            ));
        }

        return curvas;
    }

    public List<CurvaReferencia>? ObterCurvasPesoPadrao(string sexo)
    {
        // Usar dados OMS (padrão)
        var keyOms = $"oms/peso_{sexo}".ToLower();
        
        if (_cacheWeightData.ContainsKey(keyOms))
        {
            var dadosOms = _cacheWeightData[keyOms];
            
            var porSemana = dadosOms
                .Where(p => p.Days == 0)
                .GroupBy(p => p.Weeks)
                .OrderBy(g => g.Key)
                .Select(g => g.First())
                .ToList();

            var curvas = new List<CurvaReferencia>();

            foreach (var ponto in porSemana)
            {
                curvas.Add(new CurvaReferencia(
                    ponto.Weeks,
                    ponto.ZN3,
                    ponto.ZN2,
                    ponto.ZN1,
                    ponto.Z0,
                    ponto.ZP1,
                    ponto.ZP2,
                    ponto.ZP3
                ));
            }

            return curvas;
        }
        
        // Fallback: tentar formato antigo
        return ObterCurvasReferencia("OMS", "peso", sexo);
    }

    public List<CurvaReferencia>? ObterCurvasReferencia(string tipo, string medida, string sexo)
    {
        var key = $"{tipo}/{medida}_{sexo}".ToLower();
        
        // Tentar usar dados com formato WeightDataPoint (weeks/days/z_-3)
        if (_cacheWeightData.ContainsKey(key))
        {
            var tabela = _cacheWeightData[key];
            
            // Filtrar apenas pontos com days = 0 (início da semana) e agrupar por semana
            var porSemana = tabela
                .Where(p => p.Days == 0)
                .GroupBy(p => p.Weeks)
                .OrderBy(g => g.Key)
                .Select(g => g.First())
                .ToList();

            var curvas = new List<CurvaReferencia>();
            
            foreach (var ponto in porSemana)
            {
                curvas.Add(new CurvaReferencia(
                    ponto.Weeks,
                    ponto.ZN3,
                    ponto.ZN2,
                    ponto.ZN1,
                    ponto.Z0,
                    ponto.ZP1,
                    ponto.ZP2,
                    ponto.ZP3
                ));
            }

            return curvas;
        }
        
        // Tentar usar dados com idadeDias primeiro (arquivos de prematuros)
        if (_cacheJson.ContainsKey(key))
        {
            var tabela = _cacheJson[key];
            
            // Filtrar apenas pontos com idadeDias = 0 (início da semana) e agrupar por semana
            var porSemana = tabela
                .Where(p => p.IdadeDias == 0)
                .GroupBy(p => p.IdadeSemanas)
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    Semanas = g.Key,
                    Pontos = g.ToList()
                })
                .ToList();

            var curvas = new List<CurvaReferencia>();
            
            foreach (var grupo in porSemana)
            {
                var pontos = grupo.Pontos;
                var zN3 = pontos.FirstOrDefault(p => p.Z == -3)?.Valor ?? 0;
                var zN2 = pontos.FirstOrDefault(p => p.Z == -2)?.Valor ?? 0;
                var zN1 = pontos.FirstOrDefault(p => p.Z == -1)?.Valor ?? 0;
                var z0 = pontos.FirstOrDefault(p => p.Z == 0)?.Valor ?? 0;
                var zP1 = pontos.FirstOrDefault(p => p.Z == 1)?.Valor ?? 0;
                var zP2 = pontos.FirstOrDefault(p => p.Z == 2)?.Valor ?? 0;
                var zP3 = pontos.FirstOrDefault(p => p.Z == 3)?.Valor ?? 0;

                curvas.Add(new CurvaReferencia(
                    grupo.Semanas,
                    zN3,
                    zN2,
                    zN1,
                    z0,
                    zP1,
                    zP2,
                    zP3
                ));
            }

            return curvas;
        }
        
        // Fallback para formato antigo (sem idadeDias)
        if (!_cache.ContainsKey(key)) return null;

        var tabelaOld = _cache[key];
        
        // Agrupar por semana
        var porSemanaOld = tabelaOld
            .Where(p => Math.Abs(p.IdadeSemanas - Math.Floor(p.IdadeSemanas)) < 0.001)
            .GroupBy(p => (int)Math.Round(p.IdadeSemanas))
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                Semanas = g.Key,
                Pontos = g.ToList()
            })
            .ToList();

        var curvasOld = new List<CurvaReferencia>();
        
        foreach (var grupo in porSemanaOld)
        {
            var pontos = grupo.Pontos;
            var zN3 = pontos.FirstOrDefault(p => Math.Abs(p.Z - (-3)) < 0.001)?.Valor ?? 0;
            var zN2 = pontos.FirstOrDefault(p => Math.Abs(p.Z - (-2)) < 0.001)?.Valor ?? 0;
            var zN1 = pontos.FirstOrDefault(p => Math.Abs(p.Z - (-1)) < 0.001)?.Valor ?? 0;
            var z0 = pontos.FirstOrDefault(p => Math.Abs(p.Z - 0) < 0.001)?.Valor ?? 0;
            var zP1 = pontos.FirstOrDefault(p => Math.Abs(p.Z - 1) < 0.001)?.Valor ?? 0;
            var zP2 = pontos.FirstOrDefault(p => Math.Abs(p.Z - 2) < 0.001)?.Valor ?? 0;
            var zP3 = pontos.FirstOrDefault(p => Math.Abs(p.Z - 3) < 0.001)?.Valor ?? 0;

            curvasOld.Add(new CurvaReferencia(
                grupo.Semanas,
                zN3,
                zN2,
                zN1,
                z0,
                zP1,
                zP2,
                zP3
            ));
        }

        return curvasOld;
    }
}
