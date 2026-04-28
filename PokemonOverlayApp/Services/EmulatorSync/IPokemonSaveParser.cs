using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public interface IPokemonSaveParser
{
    bool CanParse(PokemonGame game);
    Task<PokemonTeam> ParseAsync(string filePath, PokemonGame game, CancellationToken cancellationToken = default);
}
