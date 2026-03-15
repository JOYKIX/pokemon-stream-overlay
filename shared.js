export const MAX_TEAM_SIZE = 6;

export function normalizeChannelId(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function normalizePokemonIdentifier(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .replace(/[\s']/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function safeLevel(value) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return 100;
  return Math.max(1, Math.min(100, n));
}

export function buildOverlayUrl(channelId) {
  const url = new URL('./overlay.html', window.location.href);
  if (channelId) url.searchParams.set('channel', channelId);
  return url.toString();
}

export function emptySlot(index) {
  return {
    slot: index + 1,
    pokemon: "",
    nickname: "",
    level: 100,
    shiny: false
  };
}

export function createDefaultTeam() {
  return Array.from({ length: MAX_TEAM_SIZE }, (_, i) => emptySlot(i));
}

const pokemonCache = new Map();

export async function fetchPokemon(identifier) {
  const normalized = normalizePokemonIdentifier(identifier);
  if (!normalized) return null;
  if (pokemonCache.has(normalized)) return pokemonCache.get(normalized);

  const promise = (async () => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(normalized)}`);
    if (!response.ok) return null;
    const data = await response.json();

    const speciesResponse = await fetch(data.species.url);
    const species = speciesResponse.ok ? await speciesResponse.json() : null;

    const frenchName = species?.names?.find((entry) => entry.language?.name === 'fr')?.name || null;
    const englishName = species?.names?.find((entry) => entry.language?.name === 'en')?.name || data.name;

    return {
      id: data.id,
      apiName: data.name,
      englishName,
      frenchName,
      sprites: {
        normal:
          data.sprites.other?.['official-artwork']?.front_default ||
          data.sprites.other?.home?.front_default ||
          data.sprites.front_default ||
          '',
        shiny:
          data.sprites.other?.home?.front_shiny ||
          data.sprites.front_shiny ||
          data.sprites.other?.['official-artwork']?.front_default ||
          data.sprites.front_default ||
          ''
      }
    };
  })();

  pokemonCache.set(normalized, promise);
  return promise;
}

export function createOverlayMarkup({ trainerName = '', channelId = '', team = [], resolvedMap = new Map() }) {
  const safeTrainer = (trainerName || 'Dresseur').trim() || 'Dresseur';
  const updated = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const cards = team.map((slot, index) => {
    const normalized = normalizePokemonIdentifier(slot?.pokemon);
    const resolved = normalized ? resolvedMap.get(normalized) : null;
    const nickname = (slot?.nickname || '').trim();
    const level = safeLevel(slot?.level);
    const shiny = Boolean(slot?.shiny);

    if (!normalized || !resolved) {
      return `
        <article class="team-card empty">
          <div class="card-top">
            <span class="slot-badge">Slot ${index + 1}</span>
          </div>
          <div class="empty-copy">Aucun Pokémon</div>
        </article>
      `;
    }

    const displayName = nickname || resolved.frenchName || resolved.englishName || resolved.apiName;
    const speciesLabel = nickname
      ? (resolved.frenchName || resolved.englishName || resolved.apiName)
      : `#${resolved.id.toString().padStart(4, '0')}`;
    const sprite = shiny ? (resolved.sprites.shiny || resolved.sprites.normal) : resolved.sprites.normal;

    return `
      <article class="team-card">
        <div class="card-top">
          <span class="slot-badge">Slot ${index + 1}</span>
          ${shiny ? '<span class="shiny-badge" title="Shiny">✨</span>' : ''}
        </div>
        <div class="sprite-wrap">
          <img src="${sprite}" alt="${displayName}" loading="eager" />
        </div>
        <div>
          <div class="card-name">${escapeHtml(displayName)}</div>
          <div class="card-species">${escapeHtml(speciesLabel)}</div>
          <div class="card-level">Niv. ${level}</div>
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="preview-overlay">
      <header class="overlay-header">
        <div>
          <div class="overlay-title">Équipe de ${escapeHtml(safeTrainer)}</div>
          <div class="overlay-subtitle">Room : ${escapeHtml(channelId || 'aucune')} · Mise à jour ${escapeHtml(updated)}</div>
        </div>
      </header>
      <div class="team-row">${cards}</div>
    </section>
  `;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
