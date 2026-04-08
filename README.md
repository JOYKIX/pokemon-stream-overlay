# Pokémon Stream Overlay

Projet hybride pour gérer un overlay Pokémon :

- **Frontend React (Vite)** pour la connexion Twitch (`/`).
- **Backend Express** pour OAuth Twitch et session (`backend/server.js`).
- **Frontend statique TypeScript compilé en `dist/`** pour l’éditeur overlay historique (`login.html`, `overlay.html`, etc.).

## Architecture rapide

- `src/`: application React (écran de connexion Twitch).
- `backend/server.js`: API/session OAuth Twitch.
- `*.ts` à la racine: logique de l’éditeur overlay historique.
- `dist/`: sortie compilée consommée par les pages HTML historiques.
- `lang/`: traductions UI.

## Configuration environnement

Le backend lit les variables depuis un fichier **`.env` à la racine**.

1. Copier le modèle:

```bash
cp .env.example .env
```

2. Remplir les variables Twitch:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_REDIRECT_URI` (ex: `http://localhost:3000/auth/twitch/callback`)
- `SESSION_SECRET`

> Un exemple backend dédié est aussi fourni dans `backend/.env.example` pour documentation.

## Développement

```bash
npm install
npm run dev
```

- Frontend Vite: `http://localhost:5173`
- Backend Express: `http://localhost:3000`

## Build

```bash
npm run build
```

## Démarrage backend seul

```bash
npm run start
```

## Notes de sécurité

- Ne jamais versionner de secrets (`.env`, clés API, secrets session).
- Faire une rotation immédiate des secrets s’ils ont déjà été exposés.
