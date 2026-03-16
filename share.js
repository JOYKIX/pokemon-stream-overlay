import { ensureAuthenticated, clearSession } from "./auth.js";
import { generateShareCode, importSharedData } from "./shared.js";
import { initLanguageSelector } from "./i18n.js";

const shareCodeOutput = document.getElementById("shareCodeOutput");
const autoRotateOnUse = document.getElementById("autoRotateOnUse");
const generateShareBtn = document.getElementById("generateShareBtn");
const toggleShareBtn = document.getElementById("toggleShareBtn");
const copyShareBtn = document.getElementById("copyShareBtn");
const sourceChannelInput = document.getElementById("sourceChannelInput");
const sourceShareCodeInput = document.getElementById("sourceShareCodeInput");
const importShareBtn = document.getElementById("importShareBtn");
const statusBox = document.getElementById("statusBox");
const logoutBtn = document.getElementById("logoutBtn");

let session = null;

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
}

generateShareBtn?.addEventListener("click", async () => {
  try {
    const shareCode = await generateShareCode(session.channel, session.editKeyHash, {
      preHashed: true,
      autoRotateOnUse: autoRotateOnUse.checked,
      expiresInHours: 24
    });
    shareCodeOutput.value = shareCode;
    shareCodeOutput.type = "password";
    setStatus("Code de partage généré (validité 24h).", "success");
  } catch (error) {
    console.error(error);
    setStatus("Impossible de générer le code de partage.", "error");
  }
});

toggleShareBtn?.addEventListener("click", () => {
  shareCodeOutput.type = shareCodeOutput.type === "password" ? "text" : "password";
});

copyShareBtn?.addEventListener("click", async () => {
  if (!shareCodeOutput.value) {
    setStatus("Aucun code à copier.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(shareCodeOutput.value);
    setStatus("Code copié.", "success");
  } catch {
    setStatus("Impossible de copier le code.", "error");
  }
});

importShareBtn?.addEventListener("click", async () => {
  const sourceChannel = sourceChannelInput.value.trim().toLowerCase();
  const shareCode = sourceShareCodeInput.value.trim();

  if (!sourceChannel || !shareCode) {
    setStatus("Identifiant source et code requis.", "error");
    return;
  }

  try {
    await importSharedData(session.channel, session.editKeyHash, sourceChannel, shareCode, { preHashed: true });
    setStatus("Données importées (team/design). Recharge le studio si besoin.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Import impossible (code invalide/expiré ou source vide).", "error");
  }
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  initLanguageSelector();
  session = await ensureAuthenticated();
}

init();