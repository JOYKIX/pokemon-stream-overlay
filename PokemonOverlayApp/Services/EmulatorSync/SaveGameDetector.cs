using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class SaveGameDetector : ISaveGameDetector
{
    private static readonly string[] Extensions = [".sav", ".srm", ".dsv", ".dat", ".main"];
    public IReadOnlyList<string> SupportedExtensions => Extensions;

    public IReadOnlyList<string> ScanSaveFiles(string folderPath)
    {
        if (string.IsNullOrWhiteSpace(folderPath) || !Directory.Exists(folderPath)) return [];

        return Directory
            .EnumerateFiles(folderPath, "*.*", SearchOption.TopDirectoryOnly)
            .Where(file => Extensions.Contains(Path.GetExtension(file), StringComparer.OrdinalIgnoreCase))
            .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public PokemonGame? DetectGame(string filePath)
    {
        if (!File.Exists(filePath)) return null;

        var fileName = Path.GetFileNameWithoutExtension(filePath).ToLowerInvariant();
        var length = new FileInfo(filePath).Length;

        var byName = SupportedPokemonGames.All.FirstOrDefault(game =>
            game.NameHints.Any(hint => fileName.Contains(hint, StringComparison.OrdinalIgnoreCase)));
        if (byName is not null) return byName;

        var bySize = SupportedPokemonGames.All.FirstOrDefault(game => game.TypicalSaveSizes.Contains((int)length));
        if (bySize is not null) return bySize;

        // Signature interne: squelette extensible (à enrichir jeu par jeu)
        return null;
    }
}
