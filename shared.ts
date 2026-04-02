// @ts-nocheck
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPs6BlLuZuYD7nxdP--4JpiDRyrmq7mi4",
  authDomain: "pokemon-stream-overlay.firebaseapp.com",
  databaseURL: "https://pokemon-stream-overlay-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "pokemon-stream-overlay",
  storageBucket: "pokemon-stream-overlay.firebasestorage.app",
  messagingSenderId: "1008545959770",
  appId: "1:1008545959770:web:d1fe3eeaea0b61bea2ad63"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, get, onValue };

const POKEAPI_SPECIES_LIMIT = 1025;
const POKE_INDEX_STORAGE_KEY = "pokeapi-species-index-v3";
const POKE_LANGUAGES_STORAGE_KEY = "pokeapi-languages-v1";
const SUPPORTED_PROFILE_LANGUAGES = new Set(["en", "fr", "es", "ja"]);
let pokemonIndexPromise = null;
let pokemonLanguagesPromise = null;

export function cleanText(value) {
  return (value || "").trim();
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeInput(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’:%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyForApi(value) {
  return normalizeInput(value).replace(/\s+/g, "-");
}



function normalizeChannel(channel) {
  return cleanText(channel).toLowerCase();
}

function normalizeProfileLanguage(language) {
  return SUPPORTED_PROFILE_LANGUAGES.has(language) ? language : "en";
}

function normalizeRecoveryKey(value) {
  return cleanText(value).replace(/-/g, "").toUpperCase();
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function generateRecoveryKey() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const raw = bytesToHex(bytes).toUpperCase();
  return raw.match(/.{1,4}/g)?.join("-") || "";
}

async function hashRecoveryKey(recoveryKey) {
  return sha256Hex(`recovery::${normalizeRecoveryKey(recoveryKey)}`);
}

export async function hashEditKey(channel, editKey) {
  const normalizedChannel = normalizeChannel(channel);
  const sanitizedKey = cleanText(editKey);
  return sha256Hex(`${normalizedChannel}::${sanitizedKey}`);
}

async function isProfileKeyValid(profile, channel, editKeyOrHash, { preHashed = false } = {}) {
  if (!profile) return false;

  const providedHash = preHashed
    ? cleanText(editKeyOrHash)
    : await hashEditKey(channel, editKeyOrHash);

  if (profile.editKeyHash) {
    return profile.editKeyHash === providedHash;
  }

  return !preHashed && cleanText(profile.editKey) === cleanText(editKeyOrHash);
}

async function migrateLegacyEditKey(channel, profile) {
  if (!profile?.editKey || profile.editKeyHash) return;

  const editKeyHash = await hashEditKey(channel, profile.editKey);
  const { editKey: _legacyEditKey, ...safeProfile } = profile;
  await set(ref(db, `profiles/${normalizeChannel(channel)}`), {
    ...safeProfile,
    channel: normalizeChannel(channel),
    editKeyHash,
    uiLanguage: normalizeProfileLanguage(profile.uiLanguage),
    createdAt: profile.createdAt || Date.now(),
    updatedAt: Date.now()
  });
}
export function getChannelFromUrl(defaultValue = "joykix") {
  const params = new URLSearchParams(window.location.search);
  return params.get("channel")?.trim() || defaultValue;
}

export function getOverlayUrl(channel) {
  const url = new URL("overlay.html", window.location.href);
  url.searchParams.set("channel", channel);
  return url.toString();
}

async function fetchSpeciesBatch(offset, limit) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error("Impossible de récupérer la liste Pokémon.");
  }
  const data = await response.json();
  return data.results || [];
}

async function fetchSpeciesLocalizedNames(speciesUrl) {
  const response = await fetch(speciesUrl);
  if (!response.ok) {
    throw new Error("Impossible de récupérer les traductions Pokémon.");
  }
  const data = await response.json();
  const frenchName = data.names?.find(entry => entry.language?.name === "fr")?.name || "";
  const englishName = data.names?.find(entry => entry.language?.name === "en")?.name || data.name;
  const localizedNames = Object.fromEntries(
    (data.names || [])
      .filter((entry) => entry?.language?.name && entry?.name)
      .map((entry) => [entry.language.name, entry.name])
  );

  return {
    id: data.id,
    englishName,
    frenchName,
    apiName: data.name,
    localizedNames
  };
}

function getCachedJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCachedJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore cache issues
  }
}

async function buildPokemonIndex() {
  const speciesList = await fetchSpeciesBatch(0, POKEAPI_SPECIES_LIMIT);
  const entries = [];
  const chunkSize = 25;

  for (let i = 0; i < speciesList.length; i += chunkSize) {
    const chunk = speciesList.slice(i, i + chunkSize);
    const chunkEntries = await Promise.all(chunk.map(species => fetchSpeciesLocalizedNames(species.url)));
    entries.push(...chunkEntries);
  }

  entries.sort((a, b) => a.id - b.id);
  return entries;
}

function getCachedPokemonIndex() {
  const parsed = getCachedJson(POKE_INDEX_STORAGE_KEY);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return parsed;
}

function savePokemonIndexToCache(entries) {
  saveCachedJson(POKE_INDEX_STORAGE_KEY, entries);
}

export async function fetchPokemonIndex() {
  if (pokemonIndexPromise) return pokemonIndexPromise;

  const cached = getCachedPokemonIndex();
  if (cached) {
    pokemonIndexPromise = Promise.resolve(cached);
    return pokemonIndexPromise;
  }

  pokemonIndexPromise = buildPokemonIndex().then((entries) => {
    savePokemonIndexToCache(entries);
    return entries;
  });

  return pokemonIndexPromise;
}

export async function fetchFrenchPokemonIndex() {
  return fetchPokemonIndex();
}

function mapLanguageDisplayName(language) {
  const name = cleanText(language?.name);
  const localName = cleanText(language?.names?.find((entry) => entry.language?.name === "en")?.name);
  return localName || name || language?.id;
}

export async function fetchPokemonLanguages() {
  if (pokemonLanguagesPromise) return pokemonLanguagesPromise;

  const cached = getCachedJson(POKE_LANGUAGES_STORAGE_KEY);
  if (Array.isArray(cached) && cached.length > 0) {
    pokemonLanguagesPromise = Promise.resolve(cached);
    return pokemonLanguagesPromise;
  }

  pokemonLanguagesPromise = fetch("https://pokeapi.co/api/v2/language?limit=1000")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Impossible de récupérer les langues PokéAPI.");
      }
      return response.json();
    })
    .then((payload) => {
      const results = Array.isArray(payload?.results) ? payload.results : [];
      return Promise.all(results.map(async (entry) => {
        try {
          const detailsResponse = await fetch(entry.url);
          if (!detailsResponse.ok) throw new Error("Language details unavailable");
          const details = await detailsResponse.json();
          return {
            id: details.id,
            code: details.name,
            displayName: mapLanguageDisplayName(details)
          };
        } catch {
          return {
            id: Number.MAX_SAFE_INTEGER,
            code: entry.name,
            displayName: entry.name
          };
        }
      }));
    })
    .then((languages) => {
      const normalized = languages
        .filter((language) => language.code)
        .sort((a, b) => (a.id - b.id) || a.code.localeCompare(b.code));
      saveCachedJson(POKE_LANGUAGES_STORAGE_KEY, normalized);
      return normalized;
    });

  return pokemonLanguagesPromise;
}

function toApiCandidate(value, index = []) {
  const input = cleanText(value);
  if (!input) return "";
  if (/^\d+$/.test(input)) {
    return input;
  }

  const normalized = normalizeInput(input);
  const match = index.find(entry =>
    normalizeInput(entry.frenchName) === normalized ||
    normalizeInput(entry.englishName) === normalized ||
    normalizeInput(entry.apiName) === normalized ||
    Object.values(entry.localizedNames || {}).some((localizedName) => normalizeInput(localizedName) === normalized)
  );

  if (match?.apiName) {
    return match.apiName;
  }

  return slugifyForApi(input);
}

export const DEFAULT_OVERLAY_STYLE = {
  transparentBackground: true,
  backgroundColor: "#0a0a0a",
  backgroundOpacity: 0.76,
  backgroundImage: "",
  backgroundImageSize: 100,
  textColor: "#ffffff",
  accentColor: "#e53935",
  cardColor: "#111111",
  cardOpacity: 0.9,
  borderRadius: 20
};

function getSpriteFromVariant(pokemonData, variant, shiny, animated) {
  const sprites = pokemonData?.sprites || {};
  const frontDefault = shiny ? sprites.front_shiny : sprites.front_default;
  const officialArtwork = shiny
    ? sprites?.other?.["official-artwork"]?.front_shiny
    : sprites?.other?.["official-artwork"]?.front_default;
  const home = shiny
    ? sprites?.other?.home?.front_shiny
    : sprites?.other?.home?.front_default;
  const dreamWorld = sprites?.other?.dream_world?.front_default;
  const showdown = shiny
    ? sprites?.other?.showdown?.front_shiny
    : sprites?.other?.showdown?.front_default;

  const animatedGen5 = shiny
    ? sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_shiny
    : sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_default;

  const scarletViolet = sprites?.versions?.["generation-ix"]?.["scarlet-violet"]?.front_default;

  if (variant === "showdown") {
    return showdown || officialArtwork || home || frontDefault || "";
  }

  if (variant === "pixel") {
    return (animated ? animatedGen5 : frontDefault) || frontDefault || officialArtwork || home || "";
  }

  if (variant === "dream-world") {
    return dreamWorld || officialArtwork || home || frontDefault || "";
  }

  if (variant === "home") {
    return home || officialArtwork || frontDefault || "";
  }

  if (variant === "scarlet-violet") {
    return scarletViolet || home || officialArtwork || frontDefault || "";
  }

  if (variant === "official-artwork") {
    return officialArtwork || home || frontDefault || "";
  }

  if (variant === "auto") {
    if (animated) {
      return showdown || animatedGen5 || home || officialArtwork || frontDefault || "";
    }
    return officialArtwork || home || frontDefault || "";
  }

  return officialArtwork || home || frontDefault || "";
}

export function shouldUsePixelRendering(variant = "auto", animated = false) {
  if (variant === "pixel" || variant === "showdown") {
    return true;
  }

  return variant === "auto" && Boolean(animated);
}

function getSpriteVisualScale(pokemonData) {
  const referenceHeightDm = 17;
  const minScale = 0.55;
  const maxScale = 1.7;
  const pokemonHeightDm = Number(pokemonData?.height) || referenceHeightDm;
  const normalizedScale = pokemonHeightDm / referenceHeightDm;

  return Math.max(minScale, Math.min(maxScale, normalizedScale));
}

function getLocalizedSpeciesName(speciesData, language = "fr", fallback = "") {
  const requested = speciesData.names?.find(entry => entry.language?.name === language)?.name;
  const english = speciesData.names?.find(entry => entry.language?.name === "en")?.name;
  const french = speciesData.names?.find(entry => entry.language?.name === "fr")?.name;
  return requested || english || french || fallback;
}

export async function fetchPokemonLocalized(inputName, shiny = false, spriteOptions = {}) {
  const index = await fetchPokemonIndex();
  const apiName = toApiCandidate(inputName, index);
  if (!apiName) return null;

  const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
  if (!pokemonResponse.ok) {
    throw new Error(`Pokémon introuvable: ${inputName}`);
  }
  const pokemonData = await pokemonResponse.json();

  const speciesResponse = await fetch(pokemonData.species.url);
  if (!speciesResponse.ok) {
    throw new Error(`Espèce introuvable: ${inputName}`);
  }
  const speciesData = await speciesResponse.json();

  const nameLanguage = cleanText(spriteOptions.nameLanguage) || "fr";
  const displayName = getLocalizedSpeciesName(speciesData, nameLanguage, inputName);

  const artworkDefault =
    pokemonData?.sprites?.other?.["official-artwork"]?.front_default ||
    pokemonData?.sprites?.other?.home?.front_default ||
    pokemonData?.sprites?.front_default ||
    "";

  const artworkShiny =
    pokemonData?.sprites?.other?.["official-artwork"]?.front_shiny ||
    pokemonData?.sprites?.other?.home?.front_shiny ||
    pokemonData?.sprites?.front_shiny ||
    artworkDefault;

  const artwork = shiny ? artworkShiny : artworkDefault;
  const spriteVariant = spriteOptions.variant || "auto";
  const animated = Boolean(spriteOptions.animated);
  const sprite = getSpriteFromVariant(pokemonData, spriteVariant, shiny, animated) || artwork;

  const types = pokemonData.types?.map(t => t.type.name) || [];

  return {
    id: pokemonData.id,
    apiName: pokemonData.name,
    displayName,
    sprite,
    artwork,
    types,
    spriteScale: getSpriteVisualScale(pokemonData)
  };
}

export async function getNextEvolutionName(inputName) {
  const index = await fetchPokemonIndex();
  const apiName = toApiCandidate(inputName, index);
  if (!apiName) return null;

  const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
  if (!pokemonResponse.ok) return null;
  const pokemonData = await pokemonResponse.json();

  const speciesResponse = await fetch(pokemonData.species.url);
  if (!speciesResponse.ok) return null;
  const speciesData = await speciesResponse.json();

  const evolutionChainUrl = speciesData?.evolution_chain?.url;
  if (!evolutionChainUrl) return null;

  const evolutionResponse = await fetch(evolutionChainUrl);
  if (!evolutionResponse.ok) return null;
  const evolutionData = await evolutionResponse.json();

  const queue = [evolutionData.chain];
  while (queue.length) {
    const node = queue.shift();
    if (!node?.species?.name) continue;

    if (node.species.name === speciesData.name) {
      const next = node.evolves_to?.[0]?.species?.name;
      if (!next) return null;
      const translated = index.find((entry) => entry.apiName === next);
      return translated?.frenchName || next;
    }

    (node.evolves_to || []).forEach((branch) => queue.push(branch));
  }

  return null;
}

export function translateType(type) {
  const map = {
    normal: "Normal",
    fire: "Feu",
    water: "Eau",
    electric: "Électrik",
    grass: "Plante",
    ice: "Glace",
    fighting: "Combat",
    poison: "Poison",
    ground: "Sol",
    flying: "Vol",
    psychic: "Psy",
    bug: "Insecte",
    rock: "Roche",
    ghost: "Spectre",
    dragon: "Dragon",
    dark: "Ténèbres",
    steel: "Acier",
    fairy: "Fée"
  };

  return map[type] || type;
}

export function buildTeamPayload({ trainerName, badgeText, nuzlockeMode, deathCount, slots, displayOptions, overlayStyle }) {
  const asBool = (value, fallback = false) => (typeof value === "boolean" ? value : fallback);

  return {
    trainerName: cleanText(trainerName) || "Dresseur",
    badgeText: cleanText(badgeText) || "Équipe Pokémon",
    updatedAt: Date.now(),
    nuzlockeMode: Boolean(nuzlockeMode),
    deathCount: Math.max(0, Number(deathCount) || 0),
    displayOptions: {
      showHeader: asBool(displayOptions.showHeader, true),
      showName: asBool(displayOptions.showName, true),
      showNickname: asBool(displayOptions.showNickname, true),
      showLevel: asBool(displayOptions.showLevel, true),
      showItem: asBool(displayOptions.showItem, true),
      showShiny: asBool(displayOptions.showShiny, true),
      showTypes: asBool(displayOptions.showTypes, true),
      spriteVariant: cleanText(displayOptions.spriteVariant) || "auto",
      preferAnimatedSprite: Boolean(displayOptions.preferAnimatedSprite),
      spriteOnlyMode: Boolean(displayOptions.spriteOnlyMode),
      spriteScale: Math.max(0.5, Math.min(10, Number(displayOptions.spriteScale) || 1)),
      editorResolution: {
        width: Math.max(640, Number(displayOptions.editorResolution?.width) || 1920),
        height: Math.max(360, Number(displayOptions.editorResolution?.height) || 1080)
      },
      slotPositions: Array.isArray(displayOptions.slotPositions)
        ? displayOptions.slotPositions.slice(0, 7).map((position, index) => ({
            id: index + 1,
            x: Math.max(0, Math.min(100, Number(position?.x) || 0)),
            y: Math.max(0, Math.min(100, Number(position?.y) || 0))
          }))
        : [],
      slotScales: Array.isArray(displayOptions.slotScales)
        ? displayOptions.slotScales.slice(0, 6).map((value) => Math.max(0.6, Math.min(2, Number(value) || 1)))
        : Array.from({ length: 6 }, () => 1),
      showNuzlockeLabel: asBool(displayOptions.showNuzlockeLabel, true),
      pokemonNameLanguage: cleanText(displayOptions.pokemonNameLanguage) || "auto",
      overlayOrientation: cleanText(displayOptions.overlayOrientation) === "vertical" ? "vertical" : "horizontal",
      overlayWidthPx: Math.max(320, Number(displayOptions.overlayWidthPx) || 1600),
      cardLayout: {
        pokeball: {
          x: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.pokeball?.x) || 0)),
          y: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.pokeball?.y) || 0))
        },
        sprite: {
          x: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.sprite?.x) || 0)),
          y: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.sprite?.y) || 0))
        },
        level: {
          x: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.level?.x) || 0)),
          y: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.level?.y) || 0))
        },
        types: {
          x: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.types?.x) || 0)),
          y: Math.max(-120, Math.min(120, Number(displayOptions.cardLayout?.types?.y) || 0))
        }
      }
    },
    overlayStyle: {
      ...DEFAULT_OVERLAY_STYLE,
      ...(overlayStyle || {})
    },
    slots: slots.map((slot, index) => ({
      id: index + 1,
      name: cleanText(slot.name),
      nickname: cleanText(slot.nickname),
      level: Number(slot.level) || null,
      item: cleanText(slot.item),
      shiny: Boolean(slot.shiny)
    }))
  };
}

export async function saveTeam(channel, payload) {
  await set(ref(db, `teams/${normalizeChannel(channel)}`), payload);
}

export async function loadTeam(channel) {
  const snapshot = await get(ref(db, `teams/${normalizeChannel(channel)}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export function subscribeToTeam(channel, callback) {
  return onValue(ref(db, `teams/${normalizeChannel(channel)}`), snapshot => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

export function subscribeToProfile(channel, callback) {
  return onValue(ref(db, `profiles/${normalizeChannel(channel)}`), snapshot => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}


export async function getProfile(channel) {
  const snapshot = await get(ref(db, `profiles/${normalizeChannel(channel)}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function createProfile(channel, editKey, { uiLanguage = "en" } = {}) {
  const normalized = normalizeChannel(channel);
  const existing = await getProfile(normalized);
  if (existing) {
    throw new Error("IDENTIFIER_TAKEN");
  }

  const editKeyHash = await hashEditKey(normalized, editKey);
  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = await hashRecoveryKey(recoveryKey);

  await set(ref(db, `profiles/${normalized}`), {
    channel: normalized,
    editKeyHash,
    recoveryKeyHash,
    uiLanguage: normalizeProfileLanguage(uiLanguage),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  return { recoveryKey };
}

export async function verifyProfile(channel, editKeyOrHash, options = {}) {
  const profile = await getProfile(channel);
  const valid = await isProfileKeyValid(profile, channel, editKeyOrHash, options);

  if (valid) {
    await migrateLegacyEditKey(channel, profile);
  }

  return valid;
}

export async function updateProfileLanguage(channel, editKeyOrHash, language, options = {}) {
  const normalized = normalizeChannel(channel);
  const profile = await getProfile(normalized);
  const isValid = await isProfileKeyValid(profile, normalized, editKeyOrHash, options);
  if (!isValid) {
    throw new Error("INVALID_EDIT_KEY");
  }

  const { editKey: _legacyEditKey, ...safeProfile } = profile || {};
  await set(ref(db, `profiles/${normalized}`), {
    ...safeProfile,
    channel: normalized,
    uiLanguage: normalizeProfileLanguage(language),
    updatedAt: Date.now()
  });
}

export async function updateEditKey(channel, currentEditKey, nextEditKey) {
  const profile = await getProfile(channel);
  const isValid = await isProfileKeyValid(profile, channel, currentEditKey);
  if (!isValid) {
    throw new Error("INVALID_EDIT_KEY");
  }

  const nextHash = await hashEditKey(channel, nextEditKey);

  const { editKey: _legacyEditKey, ...safeProfile } = profile;

  await set(ref(db, `profiles/${normalizeChannel(channel)}`), {
    ...safeProfile,
    channel: normalizeChannel(channel),
    editKeyHash: nextHash,
    updatedAt: Date.now()
  });
}

export async function resetEditKeyWithRecovery(channel, recoveryKey, nextEditKey) {
  const normalized = normalizeChannel(channel);
  const profile = await getProfile(normalized);
  if (!profile?.recoveryKeyHash) {
    throw new Error("RECOVERY_UNAVAILABLE");
  }

  const providedHash = await hashRecoveryKey(recoveryKey);
  if (providedHash !== profile.recoveryKeyHash) {
    throw new Error("INVALID_RECOVERY_KEY");
  }

  const nextHash = await hashEditKey(normalized, nextEditKey);
  const { editKey: _legacyEditKey, ...safeProfile } = profile;
  await set(ref(db, `profiles/${normalized}`), {
    ...safeProfile,
    channel: normalized,
    editKeyHash: nextHash,
    updatedAt: Date.now()
  });
}

export async function regenerateRecoveryKey(channel, editKeyOrHash, options = {}) {
  const normalized = normalizeChannel(channel);
  const profile = await getProfile(normalized);
  const isValid = await isProfileKeyValid(profile, normalized, editKeyOrHash, options);
  if (!isValid) {
    throw new Error("INVALID_EDIT_KEY");
  }

  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = await hashRecoveryKey(recoveryKey);
  const { editKey: _legacyEditKey, ...safeProfile } = profile || {};
  await set(ref(db, `profiles/${normalized}`), {
    ...safeProfile,
    channel: normalized,
    recoveryKeyHash,
    updatedAt: Date.now()
  });

  return recoveryKey;
}

export async function deleteAccount(channel, editKeyOrHash, options = {}) {
  const normalized = normalizeChannel(channel);
  const profile = await getProfile(normalized);
  const isValid = await isProfileKeyValid(profile, normalized, editKeyOrHash, options);
  if (!isValid) {
    throw new Error("INVALID_EDIT_KEY");
  }

  await remove(ref(db, `profiles/${normalized}`));
  await remove(ref(db, `teams/${normalized}`));
}

export async function generateShareCode(channel, editKeyOrHash, {
  autoRotateOnUse = false,
  expiresInHours = 24,
  preHashed = false
} = {}) {
  const normalized = normalizeChannel(channel);
  const profile = await getProfile(normalized);
  const isValid = await isProfileKeyValid(profile, normalized, editKeyOrHash, { preHashed });
  if (!isValid) {
    throw new Error("INVALID_EDIT_KEY");
  }

  const rawCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  const shareCode = rawCode.match(/.{1,4}/g)?.join("-") || rawCode;
  const shareCodeHash = await sha256Hex(`share::${normalizeRecoveryKey(shareCode)}`);
  const now = Date.now();

  await set(ref(db, `profiles/${normalized}/shareConfig`), {
    shareCodeHash,
    autoRotateOnUse: Boolean(autoRotateOnUse),
    expiresAt: now + (Math.max(1, Number(expiresInHours) || 24) * 60 * 60 * 1000),
    lastRegeneratedAt: now,
    updatedAt: now
  });

  return shareCode;
}

export async function importSharedData(targetChannel, targetEditKey, sourceChannel, shareCode, options = {}) {
  const targetId = normalizeChannel(targetChannel);
  const sourceId = normalizeChannel(sourceChannel);
  const sourceProfile = await getProfile(sourceId);
  const targetProfile = await getProfile(targetId);

  const targetValid = await isProfileKeyValid(targetProfile, targetId, targetEditKey, options);
  if (!targetValid) {
    throw new Error("INVALID_EDIT_KEY");
  }

  const shareConfig = sourceProfile?.shareConfig;
  if (!shareConfig?.shareCodeHash) {
    throw new Error("SHARE_NOT_CONFIGURED");
  }
  if (shareConfig.expiresAt && shareConfig.expiresAt < Date.now()) {
    throw new Error("SHARE_CODE_EXPIRED");
  }

  const providedHash = await sha256Hex(`share::${normalizeRecoveryKey(shareCode)}`);
  if (providedHash !== shareConfig.shareCodeHash) {
    throw new Error("SHARE_CODE_INVALID");
  }

  const sourceTeam = await loadTeam(sourceId);
  if (!sourceTeam) {
    throw new Error("SOURCE_DATA_EMPTY");
  }

  await set(ref(db, `teams/${targetId}`), {
    ...sourceTeam,
    updatedAt: Date.now(),
    importedFrom: sourceId
  });

  if (shareConfig.autoRotateOnUse) {
    await set(ref(db, `profiles/${sourceId}/shareConfig`), {
      ...shareConfig,
      shareCodeHash: null,
      updatedAt: Date.now(),
      lastUsedAt: Date.now()
    });
  } else {
    await set(ref(db, `profiles/${sourceId}/shareConfig`), {
      ...shareConfig,
      updatedAt: Date.now(),
      lastUsedAt: Date.now()
    });
  }
}

export async function renameIdentifier(oldChannel, newChannel, editKey) {
  const oldId = normalizeChannel(oldChannel);
  const newId = normalizeChannel(newChannel);
  const sanitizedKey = cleanText(editKey);

  if (oldId === newId) return oldId;

  const oldProfile = await getProfile(oldId);
  const isValid = await isProfileKeyValid(oldProfile, oldId, sanitizedKey);
  if (!isValid) {
    throw new Error("INVALID_EDIT_KEY");
  }

  const existingNewProfile = await getProfile(newId);
  if (existingNewProfile) {
    throw new Error("IDENTIFIER_TAKEN");
  }

  const oldTeam = await loadTeam(oldId);

  const editKeyHash = await hashEditKey(newId, sanitizedKey);

  await set(ref(db, `profiles/${newId}`), {
    ...oldProfile,
    channel: newId,
    editKeyHash,
    createdAt: oldProfile.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  if (oldTeam) {
    await set(ref(db, `teams/${newId}`), {
      ...oldTeam,
      updatedAt: Date.now()
    });
  }

  await remove(ref(db, `profiles/${oldId}`));
  await remove(ref(db, `teams/${oldId}`));

  return newId;
}
