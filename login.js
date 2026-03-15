import { createProfile, verifyProfile } from "./shared.js";
import { saveSession, loadSession } from "./auth.js";

const channelInput = document.getElementById("channelInput");
const editKeyInput = document.getElementById("editKeyInput");
const createMode = document.getElementById("createMode");
const submitBtn = document.getElementById("submitBtn");
const statusBox = document.getElementById("statusBox");

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
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
      await createProfile(channel, editKey);
      setStatus("Identifiant créé et verrouillé.", "success");
    } else {
      const valid = await verifyProfile(channel, editKey);
      if (!valid) {
        setStatus("Identifiant introuvable ou clé incorrecte.", "error");
        return;
      }
      setStatus("Connexion réussie.", "success");
    }

    saveSession({ channel, editKey });
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

const existing = loadSession();
if (existing?.channel) {
  channelInput.value = existing.channel;
}
