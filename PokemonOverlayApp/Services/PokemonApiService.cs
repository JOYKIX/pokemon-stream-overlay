using System.Net.Http;
using System.Net.Http.Json;
using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services;

public sealed class PokemonApiService(HttpClient httpClient)
{
    private List<PokemonEntry>? _cached;

    public async Task<IReadOnlyList<PokemonEntry>> GetPokemonAsync(CancellationToken cancellationToken = default)
    {
        if (_cached is not null) return _cached;

        try
        {
            var response = await httpClient.GetFromJsonAsync<PokemonSpeciesResponse>(
                "https://pokeapi.co/api/v2/pokemon-species?limit=151",
                cancellationToken);

            var entries = new List<PokemonEntry>();
            if (response?.Results is null)
            {
                _cached = entries;
                return _cached;
            }

            var id = 1;
            foreach (var result in response.Results)
            {
                entries.Add(new PokemonEntry(id++, result.Name, FirstUpper(result.Name)));
            }

            _cached = entries;
            return _cached;
        }
        catch (HttpRequestException)
        {
            _cached = [];
            return _cached;
        }
        catch (TaskCanceledException)
        {
            _cached = [];
            return _cached;
        }
    }

    private static string FirstUpper(string value) => string.IsNullOrWhiteSpace(value) ? value : char.ToUpperInvariant(value[0]) + value[1..];

    private sealed class PokemonSpeciesResponse
    {
        public List<PokemonResult> Results { get; set; } = [];
    }

    private sealed class PokemonResult
    {
        public string Name { get; set; } = string.Empty;
    }
}
