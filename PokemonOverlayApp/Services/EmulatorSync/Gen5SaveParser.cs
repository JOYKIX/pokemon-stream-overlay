using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class Gen5SaveParser : BasePlaceholderSaveParser
{
    public Gen5SaveParser() : base(PokemonGeneration.Gen5) { }
}
