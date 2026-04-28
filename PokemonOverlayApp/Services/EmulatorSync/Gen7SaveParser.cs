using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class Gen7SaveParser : BasePlaceholderSaveParser
{
    public Gen7SaveParser() : base(PokemonGeneration.Gen7) { }
}
