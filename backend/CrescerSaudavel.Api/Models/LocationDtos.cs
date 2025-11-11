namespace CrescerSaudavel.Api.Models;

public record CepInfoDto(
    string Cep,
    string Logradouro,
    string? Complemento,
    string Bairro,
    string Cidade,
    string Estado,
    string IbgeCodigoMunicipio,
    string IbgeCodigoEstado
);

public record EstadoDto(
    string Sigla,
    string Nome,
    string IbgeCodigo
);

public record MunicipioDto(
    string Nome,
    string IbgeCodigo
);
