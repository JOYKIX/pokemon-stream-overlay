using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class EmulatorSaveFolderWatcherService : IEmulatorSaveFolderWatcherService
{
    private readonly ISaveGameDetector _detector;
    private readonly IReadOnlyList<IPokemonSaveParser> _parsers;
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(500);
    private readonly object _syncLock = new();
    private FileSystemWatcher? _watcher;
    private Timer? _debounceTimer;
    private PokemonTeam? _lastTeam;
    private string? _fallbackGameId;

    public event EventHandler<PokemonTeam>? TeamUpdated;
    public event EventHandler<string>? StatusChanged;
    public event EventHandler<string>? ErrorOccurred;

    public IReadOnlyList<string> AvailableSaveFiles { get; private set; } = [];
    public string WatchedFolder { get; private set; } = string.Empty;
    public string ActiveSaveFile { get; private set; } = string.Empty;
    public PokemonGame? DetectedGame { get; private set; }
    public DateTimeOffset? LastUpdate { get; private set; }

    public EmulatorSaveFolderWatcherService(ISaveGameDetector detector, IReadOnlyList<IPokemonSaveParser> parsers)
    {
        _detector = detector;
        _parsers = parsers;
    }

    public async Task ConfigureAsync(string folderPath, string? activeSaveFile = null, string? fallbackGameId = null, CancellationToken cancellationToken = default)
    {
        DisposeWatcher();
        WatchedFolder = folderPath;
        _fallbackGameId = fallbackGameId;
        AvailableSaveFiles = _detector.ScanSaveFiles(folderPath);

        ActiveSaveFile = string.IsNullOrWhiteSpace(activeSaveFile)
            ? AvailableSaveFiles.FirstOrDefault() ?? string.Empty
            : activeSaveFile;

        if (!string.IsNullOrWhiteSpace(ActiveSaveFile) && File.Exists(ActiveSaveFile))
        {
            SetupWatcher(ActiveSaveFile);
            await ForceSyncAsync(cancellationToken);
            return;
        }

        StatusChanged?.Invoke(this, "Aucun fichier de sauvegarde Pokémon détecté dans le dossier sélectionné.");
    }

    public void SetActiveSave(string filePath)
    {
        ActiveSaveFile = filePath;
        if (File.Exists(filePath))
        {
            SetupWatcher(filePath);
        }
    }

    public async Task ForceSyncAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ActiveSaveFile) || !File.Exists(ActiveSaveFile))
        {
            ErrorOccurred?.Invoke(this, "Fichier de sauvegarde actif introuvable.");
            return;
        }

        try
        {
            var game = _detector.DetectGame(ActiveSaveFile) ?? SupportedPokemonGames.All.FirstOrDefault(g => g.Id == _fallbackGameId);
            DetectedGame = game;

            if (game is null)
            {
                ErrorOccurred?.Invoke(this, "Jeu non détecté automatiquement. Sélectionnez un jeu supporté manuellement.");
                return;
            }

            var parser = _parsers.FirstOrDefault(p => p.CanParse(game));
            if (parser is null)
            {
                ErrorOccurred?.Invoke(this, $"Aucun parser disponible pour {game.DisplayName}.");
                return;
            }

            var tempCopy = Path.GetTempFileName();
            File.Copy(ActiveSaveFile, tempCopy, overwrite: true);
            try
            {
                var team = await parser.ParseAsync(tempCopy, game, cancellationToken);
                team.SaveFilePath = ActiveSaveFile;
                LastUpdate = DateTimeOffset.UtcNow;

                if (!IsSameTeam(_lastTeam, team))
                {
                    _lastTeam = team;
                    TeamUpdated?.Invoke(this, team);
                }

                StatusChanged?.Invoke(this, team.ParserStatus);
            }
            finally
            {
                File.Delete(tempCopy);
            }
        }
        catch (Exception ex)
        {
            ErrorOccurred?.Invoke(this, ex.Message);
        }
    }

    public void DisposeWatcher()
    {
        lock (_syncLock)
        {
            _watcher?.Dispose();
            _watcher = null;
            _debounceTimer?.Dispose();
            _debounceTimer = null;
        }
    }

    private void SetupWatcher(string filePath)
    {
        lock (_syncLock)
        {
            _watcher?.Dispose();
            var directory = Path.GetDirectoryName(filePath);
            if (string.IsNullOrWhiteSpace(directory)) return;

            _watcher = new FileSystemWatcher(directory)
            {
                Filter = Path.GetFileName(filePath),
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.CreationTime | NotifyFilters.Size,
                EnableRaisingEvents = true,
                IncludeSubdirectories = false
            };

            _watcher.Changed += OnSaveChanged;
            _watcher.Created += OnSaveChanged;
            _watcher.Renamed += OnSaveChanged;

            StatusChanged?.Invoke(this, $"Surveillance active: {filePath}");
        }
    }

    private void OnSaveChanged(object sender, FileSystemEventArgs e)
    {
        lock (_syncLock)
        {
            _debounceTimer?.Dispose();
            _debounceTimer = new Timer(async _ => await ForceSyncAsync(), null, _debounceDelay, Timeout.InfiniteTimeSpan);
        }
    }

    private static bool IsSameTeam(PokemonTeam? left, PokemonTeam right)
    {
        if (left is null) return false;
        if (left.Members.Count != right.Members.Count) return false;

        for (var i = 0; i < left.Members.Count; i++)
        {
            if (left.Members[i].Species != right.Members[i].Species) return false;
            if (left.Members[i].Nickname != right.Members[i].Nickname) return false;
            if (left.Members[i].Level != right.Members[i].Level) return false;
        }

        return true;
    }
}
