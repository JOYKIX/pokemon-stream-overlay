using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class Gen3SaveParser : BasePlaceholderSaveParser
{
    public Gen3SaveParser() : base(PokemonGeneration.Gen3) { }
}
