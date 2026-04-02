// @ts-nocheck
import { ensureAuthenticated, saveSession, clearSession } from "./auth.js";
import { updateEditKey, renameIdentifier, hashEditKey, regenerateRecoveryKey, deleteAccount, getProfile, updateProfileLanguage } from "./shared.js";
import { getCurrentLanguage, initPageI18n, sanitizeLanguage, setCurrentLanguage, t } from "./i18n.js";

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
    setStatus(t("options.status.current_and_next_required"), "error");
    return;
  }

  try {
    await updateEditKey(session.channel, current, next);
    const editKeyHash = await hashEditKey(session.channel, next);
    session = { ...session, editKeyHash };
    saveSession(session);
    currentKey.value = "";
    nextKey.value = "";
    setStatus(t("options.status.edit_key_updated"), "success");
  } catch (error) {
    console.error(error);
    setStatus(t("options.status.current_key_invalid"), "error");
  }
});

renameBtn.addEventListener("click", async () => {
  const newId = nextChannel.value.trim().toLowerCase();
  const key = renameKey.value.trim();
  if (!newId || !key) {
    setStatus(t("options.status.new_identifier_and_key_required"), "error");
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
    setStatus(t("options.status.identifier_renamed"), "success");
  } catch (error) {
    if (error.message === "IDENTIFIER_TAKEN") {
      setStatus(t("options.status.new_identifier_taken"), "error");
      return;
    }
    setStatus(t("options.status.rename_invalid_key"), "error");
  }
});

regenerateKeyBtn?.addEventListener("click", () => {
  const generated = Math.random().toString(36).slice(2, 14);
  nextKey.value = generated;
  setStatus(t("options.status.new_key_generated"), "success");
});

copyKeyBtn?.addEventListener("click", async () => {
  const value = nextKey.value || currentKey.value;
  if (!value) {
    setStatus(t("options.status.no_key_to_copy"), "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    setStatus(t("options.status.key_copied"), "success");
  } catch {
    setStatus(t("options.status.key_copy_error"), "error");
  }
});

toggleKeyBtn?.addEventListener("click", () => {
  const show = currentKey.type === "password";
  currentKey.type = show ? "text" : "password";
  nextKey.type = show ? "text" : "password";
  renameKey.type = show ? "text" : "password";
  setStatus(t(show ? "options.status.keys_visible" : "options.status.keys_hidden"), "info");
});

regenerateRecoveryBtn?.addEventListener("click", async () => {
  try {
    const recoveryKey = await regenerateRecoveryKey(session.channel, session.editKeyHash, { preHashed: true });
    recoveryKeyDisplay.value = recoveryKey;
    localStorage.setItem(`pokemonOverlayRecovery:${session.channel}`, recoveryKey);
    recoveryKeyDisplay.type = "password";
    setStatus(t("options.status.recovery_generated"), "success");
  } catch (error) {
    console.error(error);
    setStatus(t("options.status.recovery_regenerate_error"), "error");
  }
});

toggleRecoveryBtn?.addEventListener("click", () => {
  recoveryKeyDisplay.type = recoveryKeyDisplay.type === "password" ? "text" : "password";
});

copyRecoveryBtn?.addEventListener("click", async () => {
  if (!recoveryKeyDisplay.value) {
    setStatus(t("options.status.no_recovery_to_copy"), "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(recoveryKeyDisplay.value);
    setStatus(t("options.status.recovery_copied"), "success");
  } catch {
    setStatus(t("options.status.recovery_copy_error"), "error");
  }
});

deleteAccountBtn?.addEventListener("click", async () => {
  if (!confirm(t("options.confirm_delete"))) return;
  try {
    await deleteAccount(session.channel, session.editKeyHash, { preHashed: true });
    localStorage.removeItem(`pokemonOverlayRecovery:${session.channel}`);
    clearSession();
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    setStatus(t("options.status.delete_error"), "error");
  }
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  await initPageI18n();
  session = await ensureAuthenticated();
  if (!session) return;
  const profile = await getProfile(session.channel);
  if (profile?.uiLanguage) {
    setCurrentLanguage(sanitizeLanguage(profile.uiLanguage));
  }
  window.addEventListener("app-language-changed", async (event) => {
    try {
      await updateProfileLanguage(
        session.channel,
        session.editKeyHash,
        sanitizeLanguage(event.detail?.language || getCurrentLanguage()),
        { preHashed: true }
      );
    } catch (error) {
      console.error("Failed to save profile language", error);
    }
  });
  currentChannel.value = session.channel;
  const cachedRecovery = localStorage.getItem(`pokemonOverlayRecovery:${session.channel}`);
  if (cachedRecovery) {
    recoveryKeyDisplay.value = cachedRecovery;
  }
}

init();
