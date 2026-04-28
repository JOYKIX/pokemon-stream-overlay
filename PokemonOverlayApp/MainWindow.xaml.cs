using System.Collections.ObjectModel;
using System.Net.Http;
using System.Windows;
using System.Windows.Controls;
using PokemonOverlayApp.Data;
using PokemonOverlayApp.Models;
using PokemonOverlayApp.Services;
using PokemonOverlayApp.Services.EmulatorSync;

namespace PokemonOverlayApp;

public partial class MainWindow : Window
{
    private readonly AppService _appService;
    private readonly PokemonApiService _pokemonApiService;
    private readonly IEmulatorSaveFolderWatcherService _saveWatcherService;

    private OverlaySettings? _currentTeam;
    private ObservableCollection<TeamSlot> _teamSlots = [];

    public ObservableCollection<string> PokemonNameSuggestions { get; } = [];

    public MainWindow()
    {
        InitializeComponent();
        DataContext = this;

        _appService = new AppService(new JsonAppRepository());
        _pokemonApiService = new PokemonApiService(new HttpClient { Timeout = TimeSpan.FromSeconds(15) });
        _saveWatcherService = new EmulatorSaveFolderWatcherService(
            new SaveGameDetector(),
            [new Gen1SaveParser(), new Gen2SaveParser(), new Gen3SaveParser(), new Gen4SaveParser(), new Gen5SaveParser(), new Gen6SaveParser(), new Gen7SaveParser()]);

        _saveWatcherService.TeamUpdated += OnTeamUpdatedFromSave;
        _saveWatcherService.StatusChanged += (_, status) => Dispatcher.Invoke(() => SyncStatusLabel.Text = status);
        _saveWatcherService.ErrorOccurred += (_, error) => Dispatcher.Invoke(() => SyncErrorLabel.Text = error);

        TeamGrid.ItemsSource = _teamSlots;
        SpriteVariantCombo.SelectedIndex = 0;
        FallbackGameCombo.ItemsSource = SupportedPokemonGames.All;

        Loaded += OnLoaded;
        Closed += (_, _) => _saveWatcherService.DisposeWatcher();
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await _appService.InitializeAsync();
            LoadTeamIntoUi(_appService.GetCurrentTeam());
            RefreshOverlayUrl();
            SessionLabel.Text = "Mode local (sans compte)";

            var pokemons = await _pokemonApiService.GetPokemonAsync();
            PokemonNameSuggestions.Clear();
            foreach (var pokemon in pokemons.Select(p => p.DisplayName)) PokemonNameSuggestions.Add(pokemon);

            StudioStatus.Text = pokemons.Count > 0
                ? $"Pokédex chargé ({pokemons.Count} espèces) pour autocomplétion."
                : "Pokédex indisponible (hors-ligne).";
        }
        catch (Exception)
        {
            StudioStatus.Text = "Initialisation incomplète.";
        }
    }

    private void LoadTeamIntoUi(OverlaySettings team)
    {
        _currentTeam = team;
        TrainerInput.Text = team.TrainerName;
        TeamLabelInput.Text = team.TeamLabel;
        WidthInput.Text = team.StreamWidth.ToString();
        HeightInput.Text = team.StreamHeight.ToString();
        NuzlockeCheckbox.IsChecked = team.NuzlockeMode;

        SaveFolderInput.Text = team.EmulatorSync.SaveFolderPath;

        ShowHeaderCheckbox.IsChecked = team.DisplayOptions.ShowHeader;
        ShowNameCheckbox.IsChecked = team.DisplayOptions.ShowName;
        ShowNicknameCheckbox.IsChecked = team.DisplayOptions.ShowNickname;
        ShowItemCheckbox.IsChecked = team.DisplayOptions.ShowItem;
        ShowTypesCheckbox.IsChecked = team.DisplayOptions.ShowTypes;

        SelectSpriteVariant(team.DisplayOptions.SpriteVariant);

        _teamSlots = new ObservableCollection<TeamSlot>(NormalizeTeam(team.Team));
        TeamGrid.ItemsSource = _teamSlots;
    }

    private static IEnumerable<TeamSlot> NormalizeTeam(IReadOnlyCollection<TeamSlot> source)
    {
        var normalized = source
            .OrderBy(s => s.SlotNumber)
            .Take(6)
            .Select((s, idx) => new TeamSlot
            {
                SlotNumber = idx + 1,
                PokemonName = s.PokemonName,
                Nickname = s.Nickname,
                Level = s.Level,
                Item = s.Item,
                IsShiny = s.IsShiny
            })
            .ToList();

        for (var i = normalized.Count; i < 6; i++) normalized.Add(new TeamSlot { SlotNumber = i + 1 });
        return normalized;
    }

    private void SelectSpriteVariant(string spriteVariant)
    {
        var selected = SpriteVariantCombo.Items
            .OfType<ComboBoxItem>()
            .FirstOrDefault(i => string.Equals(i.Content?.ToString(), spriteVariant, StringComparison.OrdinalIgnoreCase));

        SpriteVariantCombo.SelectedItem = selected ?? SpriteVariantCombo.Items[0];
    }

    private void OnLoadTeamClick(object sender, RoutedEventArgs e)
    {
        LoadTeamIntoUi(_appService.GetCurrentTeam());
        StudioStatus.Text = "Équipe chargée depuis le stockage local.";
    }

    private async void OnSaveTeamClick(object sender, RoutedEventArgs e)
    {
        if (_currentTeam is null)
        {
            StudioStatus.Text = "Aucune configuration chargée.";
            return;
        }

        TeamGrid.CommitEdit(DataGridEditingUnit.Row, true);
        TeamGrid.CommitEdit();

        _currentTeam.TrainerName = TrainerInput.Text.Trim();
        _currentTeam.TeamLabel = TeamLabelInput.Text.Trim();
        _currentTeam.NuzlockeMode = NuzlockeCheckbox.IsChecked == true;
        _currentTeam.StreamWidth = ParseDimension(WidthInput.Text, 1920);
        _currentTeam.StreamHeight = ParseDimension(HeightInput.Text, 1080);

        _currentTeam.EmulatorSync.SaveFolderPath = SaveFolderInput.Text.Trim();
        _currentTeam.EmulatorSync.ActiveSaveFilePath = _saveWatcherService.ActiveSaveFile;
        _currentTeam.EmulatorSync.FallbackGameId = FallbackGameCombo.SelectedValue?.ToString() ?? string.Empty;

        _currentTeam.DisplayOptions.ShowHeader = ShowHeaderCheckbox.IsChecked == true;
        _currentTeam.DisplayOptions.ShowName = ShowNameCheckbox.IsChecked == true;
        _currentTeam.DisplayOptions.ShowNickname = ShowNicknameCheckbox.IsChecked == true;
        _currentTeam.DisplayOptions.ShowItem = ShowItemCheckbox.IsChecked == true;
        _currentTeam.DisplayOptions.ShowTypes = ShowTypesCheckbox.IsChecked == true;
        _currentTeam.DisplayOptions.SpriteVariant = (SpriteVariantCombo.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "official-artwork";

        _currentTeam.Team = NormalizeTeam(_teamSlots.ToList()).ToList();
        await _appService.SaveTeamAsync(_currentTeam);
        StudioStatus.Text = "Équipe et paramètres sauvegardés.";
    }

    private static int ParseDimension(string? value, int fallback)
    {
        if (!int.TryParse(value, out var parsed)) return fallback;
        return Math.Clamp(parsed, 320, 7680);
    }

    private async void OnExportObsClick(object sender, RoutedEventArgs e)
    {
        await _appService.ExportObsUrlAsync();
        StudioStatus.Text = "URL exportée pour OBS dans AppData.";
    }

    private void OnRefreshShareClick(object sender, RoutedEventArgs e)
    {
        RefreshOverlayUrl();
    }

    private void RefreshOverlayUrl()
    {
        OverlayUrlBox.Text = _appService.BuildOverlayUrl();
    }

    private void OnScanSaveFolderClick(object sender, RoutedEventArgs e)
    {
        var detector = new SaveGameDetector();
        var files = detector.ScanSaveFiles(SaveFolderInput.Text.Trim());
        SaveFilesList.ItemsSource = files;
        SyncDetailLabel.Text = $"{files.Count} fichier(s) compatible(s) détecté(s). Extensions: {string.Join(", ", detector.SupportedExtensions)}";
    }

    private async void OnStartWatcherClick(object sender, RoutedEventArgs e)
    {
        SyncErrorLabel.Text = string.Empty;
        await _saveWatcherService.ConfigureAsync(
            SaveFolderInput.Text.Trim(),
            SaveFilesList.SelectedItem?.ToString(),
            FallbackGameCombo.SelectedValue?.ToString());

        SaveFilesList.ItemsSource = _saveWatcherService.AvailableSaveFiles;
        SaveFilesList.SelectedItem = _saveWatcherService.ActiveSaveFile;
        RefreshSyncDetails();
    }

    private async void OnForceSyncClick(object sender, RoutedEventArgs e)
    {
        await _saveWatcherService.ForceSyncAsync();
        RefreshSyncDetails();
    }

    private void OnActiveSaveSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        var selected = SaveFilesList.SelectedItem?.ToString();
        if (string.IsNullOrWhiteSpace(selected)) return;
        _saveWatcherService.SetActiveSave(selected);
        RefreshSyncDetails();
    }

    private async void OnTeamUpdatedFromSave(object? sender, PokemonTeam team)
    {
        await Dispatcher.InvokeAsync(async () =>
        {
            if (_currentTeam is null) return;

            for (var i = 0; i < 6; i++)
            {
                var member = i < team.Members.Count ? team.Members[i] : null;
                _teamSlots[i].PokemonName = member?.Species ?? string.Empty;
                _teamSlots[i].Nickname = member?.Nickname ?? string.Empty;
                _teamSlots[i].Level = member?.Level ?? 1;
                _teamSlots[i].Item = member?.HeldItem ?? string.Empty;
                _teamSlots[i].IsShiny = member?.IsShiny ?? false;
            }

            TeamGrid.Items.Refresh();
            StudioStatus.Text = $"Équipe synchronisée depuis la save ({team.Game?.DisplayName ?? "jeu inconnu"}) à {DateTime.Now:T}.";
            await OnSaveTeamClickInternal();
            RefreshSyncDetails();
        });
    }

    private async Task OnSaveTeamClickInternal()
    {
        if (_currentTeam is null) return;
        _currentTeam.Team = NormalizeTeam(_teamSlots.ToList()).ToList();
        await _appService.SaveTeamAsync(_currentTeam);
    }

    private void RefreshSyncDetails()
    {
        var gameText = _saveWatcherService.DetectedGame?.DisplayName ?? "inconnu";
        var updated = _saveWatcherService.LastUpdate?.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss") ?? "n/a";

        SyncDetailLabel.Text = $"Dossier: {_saveWatcherService.WatchedFolder}\n" +
                               $"Fichier actif: {_saveWatcherService.ActiveSaveFile}\n" +
                               $"Jeu détecté: {gameText}\n" +
                               $"Dernière mise à jour: {updated}";
    }
}
