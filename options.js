import { ensureAuthenticated, saveSession, clearSession } from "./auth.js";
import { updateEditKey, renameIdentifier, hashEditKey } from "./shared.js";

const currentChannel = document.getElementById("currentChannel");
const currentKey = document.getElementById("currentKey");
const nextKey = document.getElementById("nextKey");
const updateKeyBtn = document.getElementById("updateKeyBtn");
const nextChannel = document.getElementById("nextChannel");
const renameKey = document.getElementById("renameKey");
const renameBtn = document.getElementById("renameBtn");
const statusBox = document.getElementById("statusBox");
const logoutBtn = document.getElementById("logoutBtn");

let session = null;

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
}

updateKeyBtn.addEventListener("click", async () => {
  const current = currentKey.value.trim();
  const next = nextKey.value.trim();
  if (!current || !next) {
    setStatus("Renseigne la clé actuelle et la nouvelle.", "error");
    return;
  }

  try {
    await updateEditKey(session.channel, current, next);
    const editKeyHash = await hashEditKey(session.channel, next);
    session = { ...session, editKeyHash };
    saveSession(session);
    currentKey.value = "";
    nextKey.value = "";
    setStatus("Clé d'édition mise à jour.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Clé actuelle invalide.", "error");
  }
});

renameBtn.addEventListener("click", async () => {
  const newId = nextChannel.value.trim().toLowerCase();
  const key = renameKey.value.trim();
  if (!newId || !key) {
    setStatus("Renseigne un nouvel identifiant et ta clé.", "error");
    return;
  }

  try {
    const renamed = await renameIdentifier(session.channel, newId, key);
    const editKeyHash = await hashEditKey(renamed, key);
    session = { ...session, channel: renamed, editKeyHash };
    saveSession(session);
    currentChannel.value = renamed;
    nextChannel.value = "";
    renameKey.value = "";
    setStatus("Identifiant renommé. L'ancien ID a été supprimé.", "success");
  } catch (error) {
    if (error.message === "IDENTIFIER_TAKEN") {
      setStatus("Le nouvel identifiant est déjà pris.", "error");
      return;
    }
    setStatus("Impossible de renommer (clé invalide).", "error");
  }
});

async function init() {
  session = await ensureAuthenticated();
  if (!session) return;
  currentChannel.value = session.channel;
}

init();


logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});
