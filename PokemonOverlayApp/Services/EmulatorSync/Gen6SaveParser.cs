using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Services.EmulatorSync;

public sealed class Gen6SaveParser : BasePlaceholderSaveParser
{
    public Gen6SaveParser() : base(PokemonGeneration.Gen6) { }
}
