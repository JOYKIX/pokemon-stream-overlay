# PokéOverlay Live

Overlay Pokémon en direct pour OBS, hébergé sur GitHub Pages.

## Pourquoi l'ancienne version ne marchait pas

`localStorage` ne partage pas l'état entre ta page web classique et la source navigateur d'OBS de façon fiable. Pour qu'un changement dans le site mette à jour l'overlay OBS en direct, il faut un stockage partagé côté cloud.

Cette version utilise :

- **GitHub Pages** pour héberger le site
- **Firebase Realtime Database** pour synchroniser l'équipe en direct
- **PokéAPI** pour récupérer sprites et noms Pokémon

## Fichiers

- `login.html` : connexion par identifiant + clé d'édition
- `index.html` : éditeur principal de team
- `customize.html` : éditeur de design overlay
- `options.html` : changement d'identifiant et de clé
- `overlay.html` : page à mettre dans OBS
- `styles.css` : design global
- `app.js`, `customize.js`, `login.js`, `options.js` : logique des interfaces
- `overlay.js` : logique OBS
- `shared.js` + `auth.js` : fonctions communes + session locale

## Mise en place

### 1) Crée un projet Firebase

- Va dans Firebase Console
- Crée un projet
- Ajoute une **application Web**
- Copie l'objet de configuration
- Active **Realtime Database**

### 2) Règles temporaires simples

Pour tester rapidement, mets ces règles :

```json
{
  "rules": {
    "teams": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 3) Configure `config.js`

Copie `config.example.js` en `config.js` puis remplace les valeurs.

### 4) Publie sur GitHub Pages

- Crée un dépôt GitHub
- Envoie tous les fichiers
- Active GitHub Pages dans **Settings > Pages**
- Publie depuis la branche `main` et le dossier racine

### 5) Utilise OBS

Mets en source navigateur :

```text
https://ton-utilisateur.github.io/ton-repo/overlay.html?channel=joykix
```

## Conseils OBS

- Largeur : `1920`
- Hauteur : `360`
- Coche le rafraîchissement quand la scène devient active

## Remarques importantes

- Le champ Pokémon attend surtout un **nom PokéAPI anglais** ou un **numéro du Pokédex**
- Les noms affichés sur l'overlay remontent en français quand PokéAPI les fournit
- La synchronisation est en direct via Firebase


## Sécurité de l'éditeur

- Le projet utilise un mécanisme léger : **identifiant unique + clé d'édition**.
- Ce n'est **pas** un système de compte utilisateur complet (pas d'email / mot de passe).
- Si l'identifiant existe déjà dans la base, la création est refusée.
- Les options permettent de :
  - changer la clé d'édition
  - changer l'identifiant (ce qui supprime l'ancien ID dans la database)

