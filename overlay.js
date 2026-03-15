import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getDatabase, onValue, ref } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';
import {
  createDefaultTeam,
  createOverlayMarkup,
  fetchPokemon,
  normalizeChannelId,
  normalizePokemonIdentifier
} from './shared.js';

const config = window.APP_CONFIG;
const mount = document.getElementById('overlayMount');

if (!config?.firebase?.apiKey) {
  mount.innerHTML = '<section class="overlay-error">Configuration Firebase absente. Ajoute <code>config.js</code> avant de lancer le site.</section>';
  throw new Error('APP_CONFIG manquant');
}

const app = initializeApp(config.firebase);
const database = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const channelId = normalizeChannelId(params.get('channel')) || normalizeChannelId(config.defaultChannel) || 'stream';

mount.innerHTML = '<div class="overlay-loading">Connexion à la room…</div>';

onValue(ref(database, `teams/${channelId}`), async (snapshot) => {
  const data = snapshot.exists() ? snapshot.val() : { trainerName: '', team: createDefaultTeam() };
  const team = createDefaultTeam().map((fallback, index) => ({
    ...fallback,
    ...(data.team?.[index] || {})
  }));

  const resolvedMap = new Map();
  const uniqueEntries = [...new Set(team.map((slot) => normalizePokemonIdentifier(slot.pokemon)).filter(Boolean))];

  await Promise.all(uniqueEntries.map(async (entry) => {
    const resolved = await fetchPokemon(entry);
    if (resolved) resolvedMap.set(entry, resolved);
  }));

  mount.innerHTML = createOverlayMarkup({
    trainerName: data.trainerName || '',
    channelId,
    team,
    resolvedMap
  });
}, (error) => {
  console.error(error);
  mount.innerHTML = '<section class="overlay-error">Impossible de lire la room. Vérifie Firebase, l’URL de l’overlay et les règles de sécurité.</section>';
});
