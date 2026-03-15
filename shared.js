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

const SPECIAL_ALIASES = {
  "m mime": "mr-mime",
  "m. mime": "mr-mime",
  "mime jr": "mime-jr",
  "mime jr.": "mime-jr",
  "type 0": "type-null",
  "type:0": "type-null",
  "ho oh": "ho-oh",
  "ho-oh": "ho-oh",
  "porygon z": "porygon-z",
  "caninos de hisui": "growlithe-hisui",
  "arcanin de hisui": "arcanine-hisui",
  "voltorbe de hisui": "voltorb-hisui",
  "electrode de hisui": "electrode-hisui",
  "qwilfish de hisui": "qwilfish-hisui",
  "farfuret de hisui": "sneasel-hisui",
  "zorua de hisui": "zorua-hisui",
  "zoroark de hisui": "zoroark-hisui",
  "brindibou": "rowlet",
  "effleche": "dartrix",
  "archduc": "decidueye",
  "archduc de hisui": "decidueye-hisui",
  "goupix d alola": "vulpix-alola",
  "goupix d'alola": "vulpix-alola",
  "feunard d alola": "ninetales-alola",
  "feunard d'alola": "ninetales-alola",
  "sabelette d alola": "sandshrew-alola",
  "sabelette d'alola": "sandshrew-alola",
  "sablaireau d alola": "sandslash-alola",
  "sablaireau d'alola": "sandslash-alola",
  "rattata d alola": "rattata-alola",
  "rattata d'alola": "rattata-alola",
  "rattatac d alola": "raticate-alola",
  "rattatac d'alola": "raticate-alola",
  "miaouss d alola": "meowth-alola",
  "miaouss d'alola": "meowth-alola",
  "miaouss de galar": "meowth-galar",
  "ponyta de galar": "ponyta-galar",
  "galopa de galar": "rapidash-galar",
  "ramoloss de galar": "slowpoke-galar",
  "flagadoss de galar": "slowbro-galar",
  "roigada de galar": "slowking-galar",
  "artikodin de galar": "articuno-galar",
  "electhor de galar": "zapdos-galar",
  "sulfura de galar": "moltres-galar",
  "paldean tauros": "tauros-paldea-combat-breed"
};

export function toApiCandidate(value) {
  const normalized = normalizeInput(value);
  return SPECIAL_ALIASES[normalized] || slugifyForApi(value);
}

export async function fetchPokemonLocalized(inputName, shiny = false) {
  const apiName = toApiCandidate(inputName);
  if (!apiName) return null;

  const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
  if (!pokemonResponse.ok) {
    throw new Error(`Pokémon introuvable : ${inputName}`);
  }
  const pokemonData = await pokemonResponse.json();

  const speciesResponse = await fetch(pokemonData.species.url);
  if (!speciesResponse.ok) {
    throw new Error(`Espèce introuvable : ${inputName}`);
  }
  const speciesData = await speciesResponse.json();

  const frenchName =
    speciesData.names?.find(entry => entry.language?.name === "fr")?.name ||
    inputName;

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

  const sprite = artwork;

  const types = pokemonData.types?.map(t => t.type.name) || [];

  return {
    id: pokemonData.id,
    apiName: pokemonData.name,
    frenchName,
    sprite,
    artwork,
    types
  };
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

export function buildTeamPayload({ trainerName, badgeText, nuzlockeMode, deathCount, slots, displayOptions }) {
  return {
    trainerName: cleanText(trainerName) || "Dresseur",
    badgeText: cleanText(badgeText) || "Pokémon Team",
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
