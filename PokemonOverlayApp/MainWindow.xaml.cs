using System.Collections.ObjectModel;
using System.Net.Http;
using System.Windows;
using System.Windows.Controls;
using PokemonOverlayApp.Data;
using PokemonOverlayApp.Models;
using PokemonOverlayApp.Services;

namespace PokemonOverlayApp;

public partial class MainWindow : Window
{
    private readonly AppService _appService;
    private readonly PokemonApiService _pokemonApiService;
    private OverlaySettings? _currentTeam;
    private ObservableCollection<TeamSlot> _teamSlots = [];

    public MainWindow()
    {
        InitializeComponent();

        _appService = new AppService(new JsonAppRepository());
        _pokemonApiService = new PokemonApiService(new HttpClient { Timeout = TimeSpan.FromSeconds(10) });
        TeamGrid.ItemsSource = _teamSlots;
        SpriteVariantCombo.SelectedIndex = 0;

        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await _appService.InitializeAsync();
            var pokemons = await _pokemonApiService.GetPokemonAsync();
            StudioStatus.Text = pokemons.Count > 0
                ? $"Pokédex chargé ({pokemons.Count} espèces Gen1)."
                : "Pokédex indisponible (hors-ligne). L'application reste utilisable.";
        }
        catch (Exception)
        {
            StudioStatus.Text = "Initialisation incomplète. Vérifiez les paramètres locaux puis réessayez.";
        }
    }

    private async void OnLoginClick(object sender, RoutedEventArgs e)
    {
        var result = await _appService.SignInOrCreateAsync(ChannelInput.Text, EditKeyInput.Password, CreateModeCheckbox.IsChecked == true);
        LoginStatus.Text = result.Success
            ? $"{result.Message} {(result.RecoveryKey is null ? string.Empty : $"Clé de récupération: {result.RecoveryKey}")}"
            : result.Message;

        if (!result.Success)
        {
            return;
        }

        SessionLabel.Text = $"Session active: {_appService.CurrentUser?.Channel}";
        LoadTeamIntoUi(_appService.GetCurrentTeam());
        RefreshOverlayUrl();
    }

    private void LoadTeamIntoUi(OverlaySettings team)
    {
        _currentTeam = team;
        TrainerInput.Text = team.TrainerName;
        TeamLabelInput.Text = team.TeamLabel;
        WidthInput.Text = team.StreamWidth.ToString();
        HeightInput.Text = team.StreamHeight.ToString();
        NuzlockeCheckbox.IsChecked = team.NuzlockeMode;

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

        for (var i = normalized.Count; i < 6; i++)
        {
            normalized.Add(new TeamSlot { SlotNumber = i + 1 });
        }

        return normalized;
    }

    private void SelectSpriteVariant(string spriteVariant)
    {
        var selected = SpriteVariantCombo.Items
            .OfType<ComboBoxItem>()
            .FirstOrDefault(i => string.Equals(i.Content?.ToString(), spriteVariant, StringComparison.OrdinalIgnoreCase));

        SpriteVariantCombo.SelectedItem = selected ?? SpriteVariantCombo.Items[0];
    }

    private async void OnLoadTeamClick(object sender, RoutedEventArgs e)
    {
        if (_appService.CurrentUser is null)
        {
            StudioStatus.Text = "Connectez-vous d'abord.";
            return;
        }

        LoadTeamIntoUi(_appService.GetCurrentTeam());
        StudioStatus.Text = "Équipe chargée depuis le stockage local.";
        await Task.CompletedTask;
    }

    private async void OnSaveTeamClick(object sender, RoutedEventArgs e)
    {
        if (_currentTeam is null)
        {
            StudioStatus.Text = "Aucune session active.";
            return;
        }

        TeamGrid.CommitEdit(DataGridEditingUnit.Row, true);
        TeamGrid.CommitEdit();

        _currentTeam.TrainerName = TrainerInput.Text.Trim();
        _currentTeam.TeamLabel = TeamLabelInput.Text.Trim();
        _currentTeam.NuzlockeMode = NuzlockeCheckbox.IsChecked == true;
        _currentTeam.StreamWidth = ParseDimension(WidthInput.Text, 1920);
        _currentTeam.StreamHeight = ParseDimension(HeightInput.Text, 1080);

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
        if (_appService.CurrentUser is null)
        {
            StudioStatus.Text = "Connectez-vous d'abord.";
            return;
        }

        await _appService.ExportObsUrlAsync();
        StudioStatus.Text = "URL exportée pour OBS dans AppData.";
    }

    private void OnRefreshShareClick(object sender, RoutedEventArgs e)
    {
        RefreshOverlayUrl();
    }

    private void RefreshOverlayUrl()
    {
        OverlayUrlBox.Text = _appService.CurrentUser is null ? string.Empty : _appService.BuildOverlayUrl();
    }

    private async void OnUpdateKeyClick(object sender, RoutedEventArgs e)
    {
        if (_appService.CurrentUser is null)
        {
            AccountStatus.Text = "Session requise.";
            return;
        }

        var newKey = NewEditKeyBox.Password.Trim();
        if (string.IsNullOrWhiteSpace(newKey))
        {
            AccountStatus.Text = "Entrez une nouvelle clé.";
            return;
        }

        var channel = _appService.CurrentUser.Channel;
        var state = await new JsonAppRepository().LoadAsync();
        var profile = state.Profiles.FirstOrDefault(p => p.Channel == channel);
        if (profile is null)
        {
            AccountStatus.Text = "Profil introuvable.";
            return;
        }

        profile.EditKeyHash = SecurityService.HashEditKey(channel, newKey);
        await new JsonAppRepository().SaveAsync(state);
        AccountStatus.Text = "Clé mise à jour.";
        NewEditKeyBox.Password = string.Empty;
    }
}
