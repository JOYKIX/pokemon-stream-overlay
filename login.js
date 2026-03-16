import { createProfile, verifyProfile, hashEditKey, resetEditKeyWithRecovery } from "./shared.js";
import { saveSession, loadSession } from "./auth.js";
import { initPageI18n, t } from "./i18n.js";

const channelInput = document.getElementById("channelInput");
const editKeyInput = document.getElementById("editKeyInput");
const createMode = document.getElementById("createMode");
const submitBtn = document.getElementById("submitBtn");
const statusBox = document.getElementById("statusBox");
const recoveryKeyBox = document.getElementById("recoveryKeyBox");

const recoveryChannelInput = document.getElementById("recoveryChannelInput");
const recoveryKeyInput = document.getElementById("recoveryKeyInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const recoverBtn = document.getElementById("recoverBtn");

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
}

function storeRecoveryKey(channel, recoveryKey) {
  localStorage.setItem(`pokemonOverlayRecovery:${channel}`, recoveryKey);
}

function showRecoveryKey(recoveryKey) {
  if (!recoveryKeyBox) return;
  recoveryKeyBox.style.display = "block";
  recoveryKeyBox.className = "status-box success";
  recoveryKeyBox.innerHTML = `<strong>${t("login.recovery_key_label")}</strong> ${recoveryKey}<br>${t("login.recovery_key_warning")}`;
}

submitBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim().toLowerCase();
  const editKey = editKeyInput.value.trim();

  if (!channel || !editKey) {
    setStatus(t("login.status.identifier_key_required"), "error");
    return;
  }

  try {
    if (createMode.checked) {
      const { recoveryKey } = await createProfile(channel, editKey);
      storeRecoveryKey(channel, recoveryKey);
      showRecoveryKey(recoveryKey);
      setStatus(t("login.status.identifier_created"), "success");
    } else {
      const valid = await verifyProfile(channel, editKey);
      if (!valid) {
        setStatus(t("login.status.identifier_or_key_invalid"), "error");
        return;
      }
      setStatus(t("login.status.login_success"), "success");
    }

    const editKeyHash = await hashEditKey(channel, editKey);
    saveSession({ channel, editKeyHash });
    window.location.href = "index.html";
  } catch (error) {
    if (error.message === "IDENTIFIER_TAKEN") {
      setStatus(t("login.status.identifier_taken"), "error");
      return;
    }
    console.error(error);
    setStatus(t("login.status.login_error"), "error");
  }
});

recoverBtn?.addEventListener("click", async () => {
  const channel = recoveryChannelInput.value.trim().toLowerCase();
  const recoveryKey = recoveryKeyInput.value.trim();
  const nextEditKey = newPasswordInput.value.trim();

  if (!channel || !recoveryKey || !nextEditKey) {
    setStatus(t("login.status.recovery_fields_required"), "error");
    return;
  }

  try {
    await resetEditKeyWithRecovery(channel, recoveryKey, nextEditKey);
    setStatus(t("login.status.edit_key_reset"), "success");
    channelInput.value = channel;
    editKeyInput.value = nextEditKey;
  } catch (error) {
    console.error(error);
    setStatus(t("login.status.recovery_invalid"), "error");
  }
});

const existing = loadSession();
if (existing?.channel) {
  channelInput.value = existing.channel;
}

initPageI18n();
