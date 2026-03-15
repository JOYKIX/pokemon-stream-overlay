import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue
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

export function cleanText(value) {
  return (value || "").trim();
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

export function getChannelFromUrl(defaultValue = "joykix") {
  const params = new URLSearchParams(window.location.search);
  return params.get("channel")?.trim() || defaultValue;
}

export function getOverlayUrl(channel) {
  const url = new URL("overlay.html", window.location.href);
  url.searchParams.set("channel", channel);
  return url.toString();
}

export function toApiCandidate(value) {
  const input = cleanText(value);
  if (/^\d+$/.test(input)) {
    return input;
  }
  return slugifyForApi(input);
}

function findLocalizedName(speciesData, displayLanguage, fallback) {
  return (
    speciesData.names?.find(entry => entry.language?.name === displayLanguage)?.name ||
    speciesData.names?.find(entry => entry.language?.name === "en")?.name ||
    fallback
  );
}

export async function fetchPokemonLocalized(inputName, shiny = false, displayLanguage = "en") {
  const apiName = toApiCandidate(inputName);
  if (!apiName) return null;

  const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
  if (!pokemonResponse.ok) {
    throw new Error(`Pokémon not found: ${inputName}`);
  }
  const pokemonData = await pokemonResponse.json();

  const speciesResponse = await fetch(pokemonData.species.url);
  if (!speciesResponse.ok) {
    throw new Error(`Species not found: ${inputName}`);
  }
  const speciesData = await speciesResponse.json();

  const displayName = findLocalizedName(speciesData, displayLanguage, inputName);

  const artworkDefault =
    pokemonData?.sprites?.other?.home?.front_default ||
    pokemonData?.sprites?.other?.["official-artwork"]?.front_default ||
    pokemonData?.sprites?.front_default ||
    "";

  const artworkShiny =
    pokemonData?.sprites?.other?.home?.front_shiny ||
    pokemonData?.sprites?.other?.["official-artwork"]?.front_shiny ||
    pokemonData?.sprites?.front_shiny ||
    artworkDefault;

  const artwork = shiny ? artworkShiny : artworkDefault;

  const types = pokemonData.types?.map(t => t.type.name) || [];

  return {
    id: pokemonData.id,
    apiName: pokemonData.name,
    displayName,
    sprite: artwork,
    artwork,
    types
  };
}

export function translateType(type, language = "en") {
  const maps = {
    en: {
      normal: "Normal",
      fire: "Fire",
      water: "Water",
      electric: "Electric",
      grass: "Grass",
      ice: "Ice",
      fighting: "Fighting",
      poison: "Poison",
      ground: "Ground",
      flying: "Flying",
      psychic: "Psychic",
      bug: "Bug",
      rock: "Rock",
      ghost: "Ghost",
      dragon: "Dragon",
      dark: "Dark",
      steel: "Steel",
      fairy: "Fairy"
    },
    fr: {
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
    },
    es: {
      normal: "Normal",
      fire: "Fuego",
      water: "Agua",
      electric: "Eléctrico",
      grass: "Planta",
      ice: "Hielo",
      fighting: "Lucha",
      poison: "Veneno",
      ground: "Tierra",
      flying: "Volador",
      psychic: "Psíquico",
      bug: "Bicho",
      rock: "Roca",
      ghost: "Fantasma",
      dragon: "Dragón",
      dark: "Siniestro",
      steel: "Acero",
      fairy: "Hada"
    }
  };

  return maps[language]?.[type] || maps.en[type] || type;
}

export function buildTeamPayload({ trainerName, badgeText, pokemonLanguage, siteLanguage, nuzlockeMode, deathCount, slots, displayOptions }) {
  return {
    trainerName: cleanText(trainerName) || "Trainer",
    badgeText: cleanText(badgeText) || "Pokémon Team",
    pokemonLanguage: cleanText(pokemonLanguage) || "en",
    siteLanguage: cleanText(siteLanguage) || "en",
    updatedAt: Date.now(),
    nuzlockeMode: Boolean(nuzlockeMode),
    deathCount: Math.max(0, Number(deathCount) || 0),
    displayOptions: {
      showHeader: Boolean(displayOptions.showHeader),
      showName: Boolean(displayOptions.showName),
      showNickname: Boolean(displayOptions.showNickname),
      showLevel: Boolean(displayOptions.showLevel),
      showItem: Boolean(displayOptions.showItem),
      showShiny: Boolean(displayOptions.showShiny),
      showTypes: Boolean(displayOptions.showTypes)
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
  await set(ref(db, `teams/${channel.trim().toLowerCase()}`), payload);
}

export async function loadTeam(channel) {
  const snapshot = await get(ref(db, `teams/${channel.trim().toLowerCase()}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export function subscribeToTeam(channel, callback) {
  return onValue(ref(db, `teams/${channel.trim().toLowerCase()}`), snapshot => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}
