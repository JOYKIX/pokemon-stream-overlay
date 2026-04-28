using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class Gen1SaveParser : BasePlaceholderSaveParser
{
    public Gen1SaveParser() : base(PokemonGeneration.Gen1) { }
}
