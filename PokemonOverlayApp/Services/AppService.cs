using System.IO;
using PokemonOverlayApp.Configuration;
using PokemonOverlayApp.Data;
using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services;

public sealed class AppService(IAppRepository repository)
{
    private AppState? _state;

    public async Task InitializeAsync()
    {
        _state = await repository.LoadAsync();
    }

    public OverlaySettings GetCurrentTeam()
    {
        if (_state is null) throw new InvalidOperationException("Application non initialisée");
        return _state.LocalTeam;
    }

    public async Task SaveTeamAsync(OverlaySettings settings)
    {
        if (_state is null) throw new InvalidOperationException("Application non initialisée");
        _state.LocalTeam = settings;
        await repository.SaveAsync(_state);
    }

    public string BuildOverlayUrl() => "pokemon-overlay://overlay?channel=local";

    public async Task ExportObsUrlAsync()
    {
        await File.WriteAllTextAsync(AppPaths.ObsExportPath, BuildOverlayUrl());
    }
}
