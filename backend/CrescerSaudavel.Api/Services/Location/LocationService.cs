using System.Net.Http.Json;
using System.Text.RegularExpressions;
using CrescerSaudavel.Api.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace CrescerSaudavel.Api.Services.Location;

public class LocationService : ILocationService
{
    private const string ViaCepUrlTemplate = "https://viacep.com.br/ws/{0}/json/";
    private const string IbgeEstadosUrl = "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome";
    private const string IbgeMunicipiosUrlTemplate = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/{0}/municipios";

    private static readonly Regex DigitsOnly = new("[^0-9]", RegexOptions.Compiled);

    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<LocationService> _logger;

    private readonly MemoryCacheEntryOptions _cacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12)
    };

    public LocationService(HttpClient httpClient, IMemoryCache cache, ILogger<LocationService> logger)
    {
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;
    }

    public async Task<CepInfoDto?> BuscarCepAsync(string cep, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(cep))
        {
            return null;
        }

        var normalizedCep = DigitsOnly.Replace(cep, string.Empty);
        if (normalizedCep.Length != 8)
        {
            return null;
        }

        var cacheKey = $"viacep:{normalizedCep}";
        if (_cache.TryGetValue(cacheKey, out CepInfoDto? cachedCep) && cachedCep != null)
        {
            return cachedCep;
        }

        try
        {
            var url = string.Format(ViaCepUrlTemplate, normalizedCep);
            var viaCep = await _httpClient.GetFromJsonAsync<ViaCepResponse>(url, cancellationToken);
            if (viaCep == null || viaCep.Erro == true || string.IsNullOrWhiteSpace(viaCep.Cep))
            {
                return null;
            }

            var estados = await ObterEstadosAsync(cancellationToken);
            var estadoInfo = estados.FirstOrDefault(e => string.Equals(e.Sigla, viaCep.Uf, StringComparison.OrdinalIgnoreCase));

            var cepInfo = new CepInfoDto(
                Cep: viaCep.Cep ?? normalizedCep,
                Logradouro: viaCep.Logradouro ?? string.Empty,
                Complemento: string.IsNullOrWhiteSpace(viaCep.Complemento) ? null : viaCep.Complemento,
                Bairro: viaCep.Bairro ?? string.Empty,
                Cidade: viaCep.Localidade ?? string.Empty,
                Estado: viaCep.Uf ?? string.Empty,
                IbgeCodigoMunicipio: viaCep.Ibge ?? string.Empty,
                IbgeCodigoEstado: estadoInfo?.IbgeCodigo ?? string.Empty
            );

            _cache.Set(cacheKey, cepInfo, _cacheOptions);
            return cepInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao consultar CEP {Cep}", normalizedCep);
            return null;
        }
    }

    public async Task<IReadOnlyCollection<EstadoDto>> ObterEstadosAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "ibge:estados";
        if (_cache.TryGetValue(cacheKey, out IReadOnlyCollection<EstadoDto>? cachedEstados) && cachedEstados != null)
        {
            return cachedEstados;
        }

        try
        {
            List<IbgeEstadoResponse>? estados = await _httpClient.GetFromJsonAsync<List<IbgeEstadoResponse>>(IbgeEstadosUrl, cancellationToken);
            if (estados == null)
            {
                return Array.Empty<EstadoDto>();
            }

            var mapped = estados
                .OrderBy(e => e.Nome)
                .Select(e => new EstadoDto(e.Sigla, e.Nome, e.Id.ToString()))
                .ToList();

            _cache.Set(cacheKey, mapped, _cacheOptions);
            return mapped;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao consultar estados IBGE");
            return Array.Empty<EstadoDto>();
        }
    }

    public async Task<IReadOnlyCollection<MunicipioDto>> ObterMunicipiosPorEstadoAsync(string uf, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(uf))
        {
            return Array.Empty<MunicipioDto>();
        }

        var normalizedUf = uf.Trim().ToUpperInvariant();
        var cacheKey = $"ibge:municipios:{normalizedUf}";
        if (_cache.TryGetValue(cacheKey, out IReadOnlyCollection<MunicipioDto>? cachedMunicipios) && cachedMunicipios != null)
        {
            return cachedMunicipios;
        }

        try
        {
            var url = string.Format(IbgeMunicipiosUrlTemplate, normalizedUf);
            List<IbgeMunicipioResponse>? municipios = await _httpClient.GetFromJsonAsync<List<IbgeMunicipioResponse>>(url, cancellationToken);
            if (municipios == null)
            {
                return Array.Empty<MunicipioDto>();
            }

            var mapped = municipios
                .OrderBy(m => m.Nome)
                .Select(m => new MunicipioDto(m.Nome, m.Id.ToString()))
                .ToList();

            _cache.Set(cacheKey, mapped, _cacheOptions);
            return mapped;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao consultar municípios para UF {Uf}", normalizedUf);
            return Array.Empty<MunicipioDto>();
        }
    }

    private sealed record IbgeEstadoResponse(int Id, string Sigla, string Nome);
    private sealed record IbgeMunicipioResponse(int Id, string Nome);
    private sealed record ViaCepResponse(
        string? Cep,
        string? Logradouro,
        string? Complemento,
        string? Bairro,
        string? Localidade,
        string? Uf,
        string? Ibge,
        string? Gia,
        string? Ddd,
        string? Siafi,
        bool? Erro
    );
}
