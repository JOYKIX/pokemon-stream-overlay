import { createProfile, verifyProfile, hashEditKey, resetEditKeyWithRecovery } from "./shared.js";
import { saveSession, loadSession } from "./auth.js";

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
  recoveryKeyBox.innerHTML = `<strong>Clé de récupération :</strong> ${recoveryKey}<br>⚠️ Conserve-la, elle sert à réinitialiser la clé d'édition.`;
}

submitBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim().toLowerCase();
  const editKey = editKeyInput.value.trim();

  if (!channel || !editKey) {
    setStatus("Identifiant et clé requis.", "error");
    return;
  }

  try {
    if (createMode.checked) {
      const { recoveryKey } = await createProfile(channel, editKey);
      storeRecoveryKey(channel, recoveryKey);
      showRecoveryKey(recoveryKey);
      setStatus("Identifiant créé et verrouillé.", "success");
    } else {
      const valid = await verifyProfile(channel, editKey);
      if (!valid) {
        setStatus("Identifiant introuvable ou clé incorrecte.", "error");
        return;
      }
      setStatus("Connexion réussie.", "success");
    }

    const editKeyHash = await hashEditKey(channel, editKey);
    saveSession({ channel, editKeyHash });
    window.location.href = "index.html";
  } catch (error) {
    if (error.message === "IDENTIFIER_TAKEN") {
      setStatus("Identifiant déjà pris dans la base de données.", "error");
      return;
    }
    console.error(error);
    setStatus("Erreur pendant la connexion.", "error");
  }
});

recoverBtn?.addEventListener("click", async () => {
  const channel = recoveryChannelInput.value.trim().toLowerCase();
  const recoveryKey = recoveryKeyInput.value.trim();
  const nextEditKey = newPasswordInput.value.trim();

  if (!channel || !recoveryKey || !nextEditKey) {
    setStatus("Identifiant + clé de récupération + nouvelle clé requis.", "error");
    return;
  }

  try {
    await resetEditKeyWithRecovery(channel, recoveryKey, nextEditKey);
    setStatus("Clé d'édition réinitialisée. Connecte-toi avec la nouvelle clé.", "success");
    channelInput.value = channel;
    editKeyInput.value = nextEditKey;
  } catch (error) {
    console.error(error);
    setStatus("Impossible de réinitialiser la clé (clé de récupération invalide).", "error");
  }
});

const existing = loadSession();
if (existing?.channel) {
  channelInput.value = existing.channel;
}
