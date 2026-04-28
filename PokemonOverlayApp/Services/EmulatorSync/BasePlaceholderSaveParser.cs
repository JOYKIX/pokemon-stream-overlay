using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public abstract class BasePlaceholderSaveParser : IPokemonSaveParser
{
    private readonly PokemonGeneration _generation;

    protected BasePlaceholderSaveParser(PokemonGeneration generation)
    {
        _generation = generation;
    }

    public bool CanParse(PokemonGame game) => game.Generation == _generation;

    public virtual Task<PokemonTeam> ParseAsync(string filePath, PokemonGame game, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new PokemonTeam
        {
            SaveFilePath = filePath,
            Game = game,
            UpdatedAt = DateTimeOffset.UtcNow,
            ParserStatus = $"Jeu reconnu ({game.DisplayName}) mais parser Gen {(int)_generation} en cours.",
            Members = []
        });
    }
}
