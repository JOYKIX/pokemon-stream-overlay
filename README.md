# Pokémon Stream Overlay — Desktop C# natif

Ce dépôt a été migré vers une **application desktop C# native (WPF)**.

## Ce qui a changé

- Le cœur utilisateur ne dépend plus du front web (`html/css/js`) ni d'un serveur HTTP interne.
- L'interface est maintenant une UI native WPF avec des écrans équivalents :
  - Connexion
  - Studio (team builder)
  - Personnalisation
  - Partage
  - Compte
- Les échanges front↔back web ont été remplacés par des appels directs à des services C#.
- Les données sont persistées localement dans `%AppData%/PokemonOverlayDesktop/state.json`.

## Architecture

`PokemonOverlayApp/`

- `MainWindow.xaml` : interface native (navigation + formulaires).
- `Models/` : modèles métier (`OverlaySettings`, `TeamSlot`, `UserProfile`, etc.).
- `Services/` : logique métier (`AppService`, `PokemonApiService`, `SecurityService`).
- `Data/` : accès aux données (`JsonAppRepository`).
- `Configuration/` : chemins et configuration locale (`AppPaths`).

## Prérequis

- Windows 10/11
- .NET SDK 8.0+

## Lancer l'application

```bash
dotnet restore PokemonOverlayApp/PokemonOverlayApp.csproj
dotnet run --project PokemonOverlayApp/PokemonOverlayApp.csproj
```

## Build release

```bash
dotnet publish PokemonOverlayApp/PokemonOverlayApp.csproj -c Release -r win-x64 --self-contained false
```

Binaire de sortie :

`PokemonOverlayApp/bin/Release/net8.0-windows/win-x64/publish/PokemonOverlayApp.exe`
