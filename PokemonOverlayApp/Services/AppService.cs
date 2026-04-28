using PokemonOverlayApp.Configuration;
using PokemonOverlayApp.Data;
using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services;

public sealed class AppService(IAppRepository repository)
{
    private AppState? _state;

    public UserProfile? CurrentUser { get; private set; }

    public async Task InitializeAsync()
    {
        _state = await repository.LoadAsync();
    }

    public async Task<(bool Success, string Message, string? RecoveryKey)> SignInOrCreateAsync(string channel, string editKey, bool createMode)
    {
        if (_state is null) await InitializeAsync();

        channel = channel.Trim().ToLowerInvariant();
        editKey = editKey.Trim();

        if (string.IsNullOrWhiteSpace(channel) || string.IsNullOrWhiteSpace(editKey))
        {
            return (false, "Identifiant et clé requis.", null);
        }

        var profile = _state!.Profiles.FirstOrDefault(p => p.Channel == channel);
        var editHash = SecurityService.HashEditKey(channel, editKey);

        if (createMode)
        {
            if (profile is not null) return (false, "Cet identifiant existe déjà.", null);

            var recovery = SecurityService.GenerateRecoveryKey();
            profile = new UserProfile
            {
                Channel = channel,
                EditKeyHash = editHash,
                RecoveryKeyHash = SecurityService.HashRecoveryKey(recovery)
            };
            _state.Profiles.Add(profile);
            _state.Teams.Add(new OverlaySettings { Channel = channel });
            CurrentUser = profile;
            await repository.SaveAsync(_state);
            return (true, "Compte créé.", recovery);
        }

        if (profile is null || profile.EditKeyHash != editHash)
        {
            return (false, "Identifiant ou clé invalide.", null);
        }

        CurrentUser = profile;
        return (true, "Connecté.", null);
    }

    public OverlaySettings GetCurrentTeam()
    {
        if (_state is null || CurrentUser is null) throw new InvalidOperationException("Utilisateur non connecté");
        return _state.Teams.First(t => t.Channel == CurrentUser.Channel);
    }

    public async Task SaveTeamAsync(OverlaySettings settings)
    {
        if (_state is null || CurrentUser is null) throw new InvalidOperationException("Utilisateur non connecté");
        var existing = _state.Teams.FindIndex(t => t.Channel == CurrentUser.Channel);
        if (existing >= 0) _state.Teams[existing] = settings;
        else _state.Teams.Add(settings);

        await repository.SaveAsync(_state);
    }

    public string BuildOverlayUrl() => $"pokemon-overlay://overlay?channel={CurrentUser?.Channel}";

    public async Task ExportObsUrlAsync()
    {
        await File.WriteAllTextAsync(AppPaths.ObsExportPath, BuildOverlayUrl());
    }
}
