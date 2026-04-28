using System.Text.Json;
using PokemonOverlayApp.Configuration;
using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Data;

public sealed class JsonAppRepository : IAppRepository
{
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };

    public async Task<AppState> LoadAsync()
    {
        Directory.CreateDirectory(AppPaths.RootDirectory);
        if (!File.Exists(AppPaths.StateFilePath))
        {
            return new AppState();
        }

        await using var stream = File.OpenRead(AppPaths.StateFilePath);
        return await JsonSerializer.DeserializeAsync<AppState>(stream, SerializerOptions) ?? new AppState();
    }

    public async Task SaveAsync(AppState state)
    {
        Directory.CreateDirectory(AppPaths.RootDirectory);
        await using var stream = File.Create(AppPaths.StateFilePath);
        await JsonSerializer.SerializeAsync(stream, state, SerializerOptions);
    }
}
