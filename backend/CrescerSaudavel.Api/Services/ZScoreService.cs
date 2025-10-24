using System.Text.Json;

namespace CrescerSaudavel.Api.Services;

public class ZScoreService
{
    private readonly IWebHostEnvironment _env;
    private readonly Dictionary<string, List<RefPoint>> _cache = new();

    public record RefPoint(double IdadeSemanas, double Z, double Valor);

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
                var data = JsonSerializer.Deserialize<List<RefPoint>>(json) ?? new();
                _cache[key] = data;
            }
        }
    }

    public double? CalcularZ(double idadeSemanas, double valor, string sexo, string tipo, string medida)
    {
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
}
