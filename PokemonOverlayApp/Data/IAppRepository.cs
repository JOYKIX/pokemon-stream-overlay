using PokemonOverlayApp.Models;

namespace PokemonOverlayApp.Data;

public interface IAppRepository
{
    Task<AppState> LoadAsync();
    Task SaveAsync(AppState state);
}
