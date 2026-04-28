using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public interface ISaveGameDetector
{
    IReadOnlyList<string> SupportedExtensions { get; }
    IReadOnlyList<string> ScanSaveFiles(string folderPath);
    PokemonGame? DetectGame(string filePath);
}
