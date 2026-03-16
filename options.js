import { ensureAuthenticated, saveSession, clearSession } from "./auth.js";
import { updateEditKey, renameIdentifier, hashEditKey, regenerateRecoveryKey, deleteAccount } from "./shared.js";
import { initLanguageSelector } from "./i18n.js";

const currentChannel = document.getElementById("currentChannel");
const currentKey = document.getElementById("currentKey");
const nextKey = document.getElementById("nextKey");
const updateKeyBtn = document.getElementById("updateKeyBtn");
const nextChannel = document.getElementById("nextChannel");
const renameKey = document.getElementById("renameKey");
const renameBtn = document.getElementById("renameBtn");
const statusBox = document.getElementById("statusBox");
const logoutBtn = document.getElementById("logoutBtn");
const regenerateKeyBtn = document.getElementById("regenerateKeyBtn");
const copyKeyBtn = document.getElementById("copyKeyBtn");
const toggleKeyBtn = document.getElementById("toggleKeyBtn");
const toastStack = document.getElementById("toastStack");

const recoveryKeyDisplay = document.getElementById("recoveryKeyDisplay");
const toggleRecoveryBtn = document.getElementById("toggleRecoveryBtn");
const regenerateRecoveryBtn = document.getElementById("regenerateRecoveryBtn");
const copyRecoveryBtn = document.getElementById("copyRecoveryBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

let session = null;

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
  pushToast(message, type);
}

function pushToast(message, type = "info") {
  if (!toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
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
    const cachedRecovery = localStorage.getItem(`pokemonOverlayRecovery:${session.channel}`);
    if (cachedRecovery) {
      localStorage.setItem(`pokemonOverlayRecovery:${renamed}`, cachedRecovery);
      localStorage.removeItem(`pokemonOverlayRecovery:${session.channel}`);
    }
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

regenerateKeyBtn?.addEventListener("click", () => {
  const generated = Math.random().toString(36).slice(2, 14);
  nextKey.value = generated;
  setStatus("Nouvelle clé générée localement.", "success");
});

copyKeyBtn?.addEventListener("click", async () => {
  const value = nextKey.value || currentKey.value;
  if (!value) {
    setStatus("Aucune clé à copier.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    setStatus("Clé copiée.", "success");
  } catch {
    setStatus("Impossible de copier la clé.", "error");
  }
});

toggleKeyBtn?.addEventListener("click", () => {
  const show = currentKey.type === "password";
  currentKey.type = show ? "text" : "password";
  nextKey.type = show ? "text" : "password";
  renameKey.type = show ? "text" : "password";
  setStatus(`Clés ${show ? "visibles" : "masquées"}.`, "info");
});

regenerateRecoveryBtn?.addEventListener("click", async () => {
  try {
    const recoveryKey = await regenerateRecoveryKey(session.channel, session.editKeyHash, { preHashed: true });
    recoveryKeyDisplay.value = recoveryKey;
    localStorage.setItem(`pokemonOverlayRecovery:${session.channel}`, recoveryKey);
    recoveryKeyDisplay.type = "password";
    setStatus("Nouvelle clé de récupération générée. Conserve-la !", "success");
  } catch (error) {
    console.error(error);
    setStatus("Impossible de régénérer la clé de récupération.", "error");
  }
});

toggleRecoveryBtn?.addEventListener("click", () => {
  recoveryKeyDisplay.type = recoveryKeyDisplay.type === "password" ? "text" : "password";
});

copyRecoveryBtn?.addEventListener("click", async () => {
  if (!recoveryKeyDisplay.value) {
    setStatus("Aucune clé de récupération à copier.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(recoveryKeyDisplay.value);
    setStatus("Clé de récupération copiée.", "success");
  } catch {
    setStatus("Impossible de copier la clé de récupération.", "error");
  }
});

deleteAccountBtn?.addEventListener("click", async () => {
  if (!confirm("Supprimer définitivement le compte et toutes les données ?")) return;
  try {
    await deleteAccount(session.channel, session.editKeyHash, { preHashed: true });
    localStorage.removeItem(`pokemonOverlayRecovery:${session.channel}`);
    clearSession();
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    setStatus("Suppression impossible (session invalide).", "error");
  }
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  initLanguageSelector();
  session = await ensureAuthenticated();
  if (!session) return;
  currentChannel.value = session.channel;
  const cachedRecovery = localStorage.getItem(`pokemonOverlayRecovery:${session.channel}`);
  if (cachedRecovery) {
    recoveryKeyDisplay.value = cachedRecovery;
  }
}

init();