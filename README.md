# PokeOverlay

PokeOverlay existe maintenant en **application desktop C# (Windows)**, en plus des fichiers web d'origine.

## Nouveau dossier C#

- `PokemonOverlayApp/` : projet WinForms (.NET 8) avec WebView2.
- L'app embarque les fichiers du site (`*.html`, `*.css`, `*.js`, `lang/`, `logo_type/`, etc.) dans `wwwroot` au build.
- Au lancement, elle ouvre `login.html` dans une fenêtre desktop.

---

## Prérequis

1. **Windows 10/11**
2. **.NET SDK 8.0**
3. **WebView2 Runtime** (souvent déjà installé via Microsoft Edge)

---

## Tuto 1 — Lancer l'app pour test

### 1) Ouvrir un terminal à la racine du repo

```bash
cd /chemin/vers/pokemon-stream-overlay
```

### 2) Restaurer les dépendances C#

```bash
dotnet restore PokemonOverlayApp/PokemonOverlayApp.csproj
```

### 3) Lancer en mode test

```bash
dotnet run --project PokemonOverlayApp/PokemonOverlayApp.csproj
```

L'application s'ouvre en fenêtre Windows et charge l'interface PokeOverlay.

---

## Tuto 2 — Générer un `.exe`

### Option A (framework-dependent, plus léger)

```bash
dotnet publish PokemonOverlayApp/PokemonOverlayApp.csproj -c Release -r win-x64 --self-contained false
```

Le `.exe` est généré dans :

```text
PokemonOverlayApp/bin/Release/net8.0-windows/win-x64/publish/
```

Fichier principal : `PokemonOverlayApp.exe`

### Option B (self-contained, plus gros mais autonome)

```bash
dotnet publish PokemonOverlayApp/PokemonOverlayApp.csproj -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true
```

Le `.exe` autonome est dans le même dossier `publish/`.

---

## Notes importantes

- Si vous utilisez Firebase, gardez votre configuration `config.js` à jour.
- L'app C# réutilise les mêmes pages que la version web, donc les comportements overlay/editor restent identiques.
- Pour OBS, vous pouvez continuer à utiliser `overlay.html` (web) ou piloter l'équipe depuis l'app desktop.
