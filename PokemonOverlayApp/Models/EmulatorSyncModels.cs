namespace PokemonOverlayApp.Models;

public enum PokemonGeneration { Gen1 = 1, Gen2, Gen3, Gen4, Gen5, Gen6, Gen7 }

public enum PokemonConsole { GameBoy, GameBoyColor, GameBoyAdvance, NintendoDS, Nintendo3DS }

public sealed class PokemonGame
{
    public string Id { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public PokemonGeneration Generation { get; init; }
    public PokemonConsole Console { get; init; }
    public IReadOnlyList<string> NameHints { get; init; } = [];
    public IReadOnlyList<int> TypicalSaveSizes { get; init; } = [];
}

public sealed class PokemonPartyMember
{
    public string Species { get; set; } = string.Empty;
    public string Nickname { get; set; } = string.Empty;
    public int Level { get; set; }
    public int CurrentHp { get; set; }
    public int MaxHp { get; set; }
    public string HeldItem { get; set; } = string.Empty;
    public string Ability { get; set; } = string.Empty;
    public string Nature { get; set; } = string.Empty;
    public List<string> Moves { get; set; } = [];
    public string Status { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public bool? IsShiny { get; set; }
}

public sealed class PokemonTeam
{
    public string SaveFilePath { get; set; } = string.Empty;
    public PokemonGame? Game { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string ParserStatus { get; set; } = string.Empty;
    public List<PokemonPartyMember> Members { get; set; } = [];
}

public static class SupportedPokemonGames
{
    public static readonly IReadOnlyList<PokemonGame> All =
    [
        new() { Id = "red", DisplayName = "Rouge", Generation = PokemonGeneration.Gen1, Console = PokemonConsole.GameBoy, NameHints = ["red", "rouge"], TypicalSaveSizes = [32768] },
        new() { Id = "blue", DisplayName = "Bleu", Generation = PokemonGeneration.Gen1, Console = PokemonConsole.GameBoy, NameHints = ["blue", "bleu"], TypicalSaveSizes = [32768] },
        new() { Id = "yellow", DisplayName = "Jaune", Generation = PokemonGeneration.Gen1, Console = PokemonConsole.GameBoy, NameHints = ["yellow", "jaune"], TypicalSaveSizes = [32768] },
        new() { Id = "gold", DisplayName = "Or", Generation = PokemonGeneration.Gen2, Console = PokemonConsole.GameBoyColor, NameHints = ["gold", "or"], TypicalSaveSizes = [32768] },
        new() { Id = "silver", DisplayName = "Argent", Generation = PokemonGeneration.Gen2, Console = PokemonConsole.GameBoyColor, NameHints = ["silver", "argent"], TypicalSaveSizes = [32768] },
        new() { Id = "crystal", DisplayName = "Cristal", Generation = PokemonGeneration.Gen2, Console = PokemonConsole.GameBoyColor, NameHints = ["crystal", "cristal"], TypicalSaveSizes = [32768] },
        new() { Id = "ruby", DisplayName = "Rubis", Generation = PokemonGeneration.Gen3, Console = PokemonConsole.GameBoyAdvance, NameHints = ["ruby", "rubis"], TypicalSaveSizes = [131072] },
        new() { Id = "sapphire", DisplayName = "Saphir", Generation = PokemonGeneration.Gen3, Console = PokemonConsole.GameBoyAdvance, NameHints = ["sapphire", "saphir"], TypicalSaveSizes = [131072] },
        new() { Id = "emerald", DisplayName = "Émeraude", Generation = PokemonGeneration.Gen3, Console = PokemonConsole.GameBoyAdvance, NameHints = ["emerald", "emeraude"], TypicalSaveSizes = [131072] },
        new() { Id = "firered", DisplayName = "Rouge Feu", Generation = PokemonGeneration.Gen3, Console = PokemonConsole.GameBoyAdvance, NameHints = ["firered", "rougefeu", "rouge feu"], TypicalSaveSizes = [131072] },
        new() { Id = "leafgreen", DisplayName = "Vert Feuille", Generation = PokemonGeneration.Gen3, Console = PokemonConsole.GameBoyAdvance, NameHints = ["leafgreen", "vertfeuille", "vert feuille"], TypicalSaveSizes = [131072] },
        new() { Id = "diamond", DisplayName = "Diamant", Generation = PokemonGeneration.Gen4, Console = PokemonConsole.NintendoDS, NameHints = ["diamond", "diamant"], TypicalSaveSizes = [524288] },
        new() { Id = "pearl", DisplayName = "Perle", Generation = PokemonGeneration.Gen4, Console = PokemonConsole.NintendoDS, NameHints = ["pearl", "perle"], TypicalSaveSizes = [524288] },
        new() { Id = "platinum", DisplayName = "Platine", Generation = PokemonGeneration.Gen4, Console = PokemonConsole.NintendoDS, NameHints = ["platinum", "platine"], TypicalSaveSizes = [524288] },
        new() { Id = "heartgold", DisplayName = "HeartGold", Generation = PokemonGeneration.Gen4, Console = PokemonConsole.NintendoDS, NameHints = ["heartgold"], TypicalSaveSizes = [524288] },
        new() { Id = "soulsilver", DisplayName = "SoulSilver", Generation = PokemonGeneration.Gen4, Console = PokemonConsole.NintendoDS, NameHints = ["soulsilver"], TypicalSaveSizes = [524288] },
        new() { Id = "black", DisplayName = "Noir", Generation = PokemonGeneration.Gen5, Console = PokemonConsole.NintendoDS, NameHints = ["black", "noir"], TypicalSaveSizes = [524288] },
        new() { Id = "white", DisplayName = "Blanc", Generation = PokemonGeneration.Gen5, Console = PokemonConsole.NintendoDS, NameHints = ["white", "blanc"], TypicalSaveSizes = [524288] },
        new() { Id = "black2", DisplayName = "Noir 2", Generation = PokemonGeneration.Gen5, Console = PokemonConsole.NintendoDS, NameHints = ["black2", "black 2", "noir2", "noir 2"], TypicalSaveSizes = [524288] },
        new() { Id = "white2", DisplayName = "Blanc 2", Generation = PokemonGeneration.Gen5, Console = PokemonConsole.NintendoDS, NameHints = ["white2", "white 2", "blanc2", "blanc 2"], TypicalSaveSizes = [524288] },
        new() { Id = "x", DisplayName = "X", Generation = PokemonGeneration.Gen6, Console = PokemonConsole.Nintendo3DS, NameHints = ["pokemon x", " x "], TypicalSaveSizes = [4194304] },
        new() { Id = "y", DisplayName = "Y", Generation = PokemonGeneration.Gen6, Console = PokemonConsole.Nintendo3DS, NameHints = ["pokemon y", " y "], TypicalSaveSizes = [4194304] },
        new() { Id = "omegaruby", DisplayName = "Rubis Oméga", Generation = PokemonGeneration.Gen6, Console = PokemonConsole.Nintendo3DS, NameHints = ["omegaruby", "omega ruby"], TypicalSaveSizes = [4194304] },
        new() { Id = "alphasapphire", DisplayName = "Saphir Alpha", Generation = PokemonGeneration.Gen6, Console = PokemonConsole.Nintendo3DS, NameHints = ["alphasapphire", "alpha sapphire"], TypicalSaveSizes = [4194304] },
        new() { Id = "sun", DisplayName = "Soleil", Generation = PokemonGeneration.Gen7, Console = PokemonConsole.Nintendo3DS, NameHints = ["sun", "soleil"], TypicalSaveSizes = [4194304] },
        new() { Id = "moon", DisplayName = "Lune", Generation = PokemonGeneration.Gen7, Console = PokemonConsole.Nintendo3DS, NameHints = ["moon", "lune"], TypicalSaveSizes = [4194304] },
        new() { Id = "ultrasun", DisplayName = "Ultra-Soleil", Generation = PokemonGeneration.Gen7, Console = PokemonConsole.Nintendo3DS, NameHints = ["ultrasun", "ultra sun"], TypicalSaveSizes = [4194304] },
        new() { Id = "ultramoon", DisplayName = "Ultra-Lune", Generation = PokemonGeneration.Gen7, Console = PokemonConsole.Nintendo3DS, NameHints = ["ultramoon", "ultra moon"], TypicalSaveSizes = [4194304] }
    ];
}
