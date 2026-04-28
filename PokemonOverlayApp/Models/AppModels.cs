namespace PokemonOverlayApp.Models;

public sealed record PokemonEntry(int Id, string ApiName, string DisplayName);

public sealed class TeamSlot
{
    public int SlotNumber { get; init; }
    public string PokemonName { get; set; } = string.Empty;
    public string Nickname { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public string Item { get; set; } = string.Empty;
    public bool IsShiny { get; set; }
}

public sealed class DisplayOptions
{
    public bool ShowHeader { get; set; } = true;
    public bool ShowName { get; set; } = true;
    public bool ShowNickname { get; set; } = true;
    public bool ShowLevel { get; set; } = true;
    public bool ShowItem { get; set; } = true;
    public bool ShowTypes { get; set; } = true;
    public bool ShowShiny { get; set; } = true;
    public string SpriteVariant { get; set; } = "official-artwork";
    public double SpriteScalePercent { get; set; } = 100;
}

public sealed class EmulatorSyncSettings
{
    public string SaveFolderPath { get; set; } = string.Empty;
    public string ActiveSaveFilePath { get; set; } = string.Empty;
    public string FallbackGameId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public sealed class OverlaySettings
{
    public string Channel { get; set; } = "local";
    public string TrainerName { get; set; } = string.Empty;
    public string TeamLabel { get; set; } = "Champion";
    public int StreamWidth { get; set; } = 1920;
    public int StreamHeight { get; set; } = 1080;
    public bool NuzlockeMode { get; set; }
    public bool ShowNuzlockeLabel { get; set; } = true;
    public int DeathCount { get; set; }
    public DisplayOptions DisplayOptions { get; set; } = new();
    public EmulatorSyncSettings EmulatorSync { get; set; } = new();
    public List<TeamSlot> Team { get; set; } = Enumerable.Range(1, 6).Select(i => new TeamSlot { SlotNumber = i }).ToList();
}

public sealed class AppState
{
    public OverlaySettings LocalTeam { get; set; } = new();
}
