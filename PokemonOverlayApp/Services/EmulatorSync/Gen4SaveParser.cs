using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class Gen4SaveParser : BasePlaceholderSaveParser
{
    public Gen4SaveParser() : base(PokemonGeneration.Gen4) { }
}
