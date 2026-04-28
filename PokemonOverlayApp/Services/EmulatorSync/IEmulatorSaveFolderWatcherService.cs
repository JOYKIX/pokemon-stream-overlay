using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public interface IEmulatorSaveFolderWatcherService
{
    event EventHandler<PokemonTeam>? TeamUpdated;
    event EventHandler<string>? StatusChanged;
    event EventHandler<string>? ErrorOccurred;

    IReadOnlyList<string> AvailableSaveFiles { get; }
    string WatchedFolder { get; }
    string ActiveSaveFile { get; }
    PokemonGame? DetectedGame { get; }
    DateTimeOffset? LastUpdate { get; }

    Task ConfigureAsync(string folderPath, string? activeSaveFile = null, string? fallbackGameId = null, CancellationToken cancellationToken = default);
    Task ForceSyncAsync(CancellationToken cancellationToken = default);
    void SetActiveSave(string filePath);
    void DisposeWatcher();
}
