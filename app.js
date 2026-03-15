import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';
import {
  MAX_TEAM_SIZE,
  buildOverlayUrl,
  createDefaultTeam,
  createOverlayMarkup,
  fetchPokemon,
  normalizeChannelId,
  normalizePokemonIdentifier,
  safeLevel
} from './shared.js';

const config = window.APP_CONFIG;
if (!config?.firebase?.apiKey) {
  document.body.innerHTML = '<main class="app-shell"><section class="panel overlay-error"><h2>Configuration manquante</h2><p>Copie <code>config.example.js</code> en <code>config.js</code> puis colle ta configuration Firebase.</p></section></main>';
  throw new Error('APP_CONFIG manquant');
}

const app = initializeApp(config.firebase);
const database = getDatabase(app);

const elements = {
  channelId: document.getElementById('channelId'),
  trainerName: document.getElementById('trainerName'),
  teamSlots: document.getElementById('teamSlots'),
  previewMount: document.getElementById('previewMount'),
  overlayUrl: document.getElementById('overlayUrl'),
  saveButton: document.getElementById('saveButton'),
  clearButton: document.getElementById('clearButton'),
  copyButton: document.getElementById('copyButton'),
  loadButton: document.getElementById('loadButton'),
  statusBanner: document.getElementById('statusBanner')
};

let teamState = createDefaultTeam();
renderSlots();
bootstrap();

function bootstrap() {
  const queryChannel = normalizeChannelId(new URLSearchParams(window.location.search).get('channel'));
  const savedChannel = normalizeChannelId(localStorage.getItem('pokeOverlayChannel'));
  const initialChannel = queryChannel || savedChannel || normalizeChannelId(config.defaultChannel) || 'stream';

  elements.channelId.value = initialChannel;
  elements.overlayUrl.value = buildOverlayUrl(initialChannel);

  attachListeners();
  updatePreview();
  loadTeam();
}

function attachListeners() {
  elements.channelId.addEventListener('input', () => {
    const value = normalizeChannelId(elements.channelId.value);
    if (value !== elements.channelId.value) elements.channelId.value = value;
    localStorage.setItem('pokeOverlayChannel', value);
    elements.overlayUrl.value = buildOverlayUrl(value);
    updatePreview();
  });

  elements.trainerName.addEventListener('input', updatePreview);
  elements.loadButton.addEventListener('click', loadTeam);
  elements.saveButton.addEventListener('click', saveTeam);
  elements.clearButton.addEventListener('click', clearTeam);
  elements.copyButton.addEventListener('click', async () => {
    await navigator.clipboard.writeText(elements.overlayUrl.value);
    setStatus('Lien OBS copié dans le presse-papiers.', 'success');
  });
}

function renderSlots() {
  elements.teamSlots.innerHTML = '';

  for (let i = 0; i < MAX_TEAM_SIZE; i += 1) {
    const slot = teamState[i];
    const card = document.createElement('article');
    card.className = 'slot-card';
    card.innerHTML = `
      <div class="slot-head">
        <span class="slot-index">${i + 1}</span>
        <span class="slot-meta">Slot ${i + 1}</span>
      </div>
      <label class="field">
        <span>Pokémon / Dex ID</span>
        <input data-slot="${i}" data-field="pokemon" type="text" value="${escapeAttr(slot.pokemon)}" placeholder="ex: pikachu ou 25" />
      </label>
      <div class="inline-mini">
        <label class="field">
          <span>Surnom</span>
          <input data-slot="${i}" data-field="nickname" type="text" value="${escapeAttr(slot.nickname)}" placeholder="facultatif" />
        </label>
        <label class="field">
          <span>Niveau</span>
          <input data-slot="${i}" data-field="level" type="number" min="1" max="100" value="${safeLevel(slot.level)}" />
        </label>
      </div>
      <label class="toggle-row">
        <span>Version shiny</span>
        <input data-slot="${i}" data-field="shiny" type="checkbox" ${slot.shiny ? 'checked' : ''} />
      </label>
    `;
    elements.teamSlots.appendChild(card);
  }

  elements.teamSlots.querySelectorAll('input').forEach((input) => {
    const handler = () => {
      const slotIndex = Number.parseInt(input.dataset.slot, 10);
      const field = input.dataset.field;
      if (field === 'shiny') {
        teamState[slotIndex][field] = input.checked;
      } else {
        teamState[slotIndex][field] = input.value;
      }
      if (field === 'level') {
        teamState[slotIndex][field] = safeLevel(input.value);
      }
      updatePreview();
    };

    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
  });
}

async function loadTeam() {
  const channelId = normalizeChannelId(elements.channelId.value);
  if (!channelId) {
    setStatus('Choisis un ID de room avant de charger une équipe.', 'error');
    return;
  }

  try {
    setStatus('Chargement de l’équipe…', 'info');
    const snapshot = await get(ref(database, `teams/${channelId}`));
    if (!snapshot.exists()) {
      setStatus('Aucune équipe enregistrée pour cette room. Tu peux en créer une maintenant.', 'info');
      return;
    }

    const data = snapshot.val();
    elements.trainerName.value = data.trainerName || '';
    teamState = createDefaultTeam().map((fallback, index) => ({
      ...fallback,
      ...(data.team?.[index] || {})
    }));
    renderSlots();
    elements.overlayUrl.value = buildOverlayUrl(channelId);
    updatePreview();
    setStatus('Équipe chargée depuis Firebase.', 'success');
  } catch (error) {
    console.error(error);
    setStatus('Impossible de charger l’équipe. Vérifie la configuration Firebase et les règles de sécurité.', 'error');
  }
}

async function saveTeam() {
  const channelId = normalizeChannelId(elements.channelId.value);
  if (!channelId) {
    setStatus('Choisis un ID de room valide avant de sauvegarder.', 'error');
    return;
  }

  const payload = {
    trainerName: elements.trainerName.value.trim(),
    updatedAt: Date.now(),
    team: teamState.map((slot, index) => ({
      slot: index + 1,
      pokemon: normalizePokemonIdentifier(slot.pokemon),
      nickname: (slot.nickname || '').trim(),
      level: safeLevel(slot.level),
      shiny: Boolean(slot.shiny)
    }))
  };

  try {
    setStatus('Sauvegarde en cours…', 'info');
    await set(ref(database, `teams/${channelId}`), payload);
    localStorage.setItem('pokeOverlayChannel', channelId);
    elements.overlayUrl.value = buildOverlayUrl(channelId);
    updatePreview();
    setStatus('Équipe sauvegardée. L’overlay OBS se met à jour en direct.', 'success');
  } catch (error) {
    console.error(error);
    setStatus('La sauvegarde a échoué. Vérifie ta configuration Firebase.', 'error');
  }
}

function clearTeam() {
  teamState = createDefaultTeam();
  renderSlots();
  updatePreview();
  setStatus('Équipe vidée localement. Clique sur “Sauvegarder en direct” pour pousser le changement.', 'info');
}

async function updatePreview() {
  const channelId = normalizeChannelId(elements.channelId.value);
  const resolvedMap = new Map();

  const uniqueEntries = [...new Set(teamState.map((slot) => normalizePokemonIdentifier(slot.pokemon)).filter(Boolean))];
  await Promise.all(uniqueEntries.map(async (entry) => {
    const resolved = await fetchPokemon(entry);
    if (resolved) resolvedMap.set(entry, resolved);
  }));

  elements.previewMount.innerHTML = createOverlayMarkup({
    trainerName: elements.trainerName.value.trim(),
    channelId,
    team: teamState,
    resolvedMap
  });
}

function setStatus(message, kind = 'info') {
  elements.statusBanner.className = `status-banner ${kind}`;
  elements.statusBanner.textContent = message;
}

function escapeAttr(value) {
  return String(value ?? '').replace(/"/g, '&quot;');
}
