import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* COLLER DATABASE ICI */
const firebaseConfig = {
  apiKey: "COLLER_API_KEY_ICI",
  authDomain: "COLLER_AUTH_DOMAIN_ICI",
  databaseURL: "COLLER_DATABASE_URL_ICI",
  projectId: "COLLER_PROJECT_ID_ICI",
  storageBucket: "COLLER_STORAGE_BUCKET_ICI",
  messagingSenderId: "COLLER_MESSAGING_SENDER_ID_ICI",
  appId: "COLLER_APP_ID_ICI"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, get, onValue };

export function normalizePokemonName(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, "-");
}

export function cleanText(value) {
  return (value || "").trim();
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

export function buildTeamPayload({ trainerName, badgeText, slots }) {
  return {
    trainerName: cleanText(trainerName) || "Dresseur",
    badgeText: cleanText(badgeText) || "Pokémon Team",
    updatedAt: Date.now(),
    slots: slots.map((slot, index) => ({
      id: index + 1,
      name: cleanText(slot.name),
      level: Number(slot.level) || null,
      item: cleanText(slot.item),
      shiny: Boolean(slot.shiny)
    }))
  };
}

export async function fetchPokemonData(name, shiny = false) {
  const normalized = normalizePokemonName(name);
  if (!normalized) return null;

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalized}`);
  if (!response.ok) {
    throw new Error(`Pokémon introuvable : ${name}`);
  }

  const data = await response.json();

  const official =
    data?.sprites?.other?.["official-artwork"]?.front_default || null;

  const front =
    shiny
      ? data?.sprites?.front_shiny || official
      : data?.sprites?.front_default || official;

  return {
    id: data.id,
    apiName: data.name,
    displayName: name,
    sprite: front || official,
    artwork: official,
    types: data.types?.map(t => t.type.name) || []
  };
}

export async function saveTeam(channel, payload) {
  const safeChannel = channel.trim().toLowerCase();
  await set(ref(db, `teams/${safeChannel}`), payload);
}

export async function loadTeam(channel) {
  const safeChannel = channel.trim().toLowerCase();
  const snapshot = await get(ref(db, `teams/${safeChannel}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export function subscribeToTeam(channel, callback) {
  const safeChannel = channel.trim().toLowerCase();
  return onValue(ref(db, `teams/${safeChannel}`), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}
