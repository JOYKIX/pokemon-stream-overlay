using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class Gen2SaveParser : BasePlaceholderSaveParser
{
    public Gen2SaveParser() : base(PokemonGeneration.Gen2) { }
}
