import { ensureAuthenticated, clearSession } from "./auth.js";
import { generateShareCode, getProfile, importSharedData, updateProfileLanguage } from "./shared.js";
import { getCurrentLanguage, initPageI18n, sanitizeLanguage, setCurrentLanguage, t } from "./i18n.js";

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
    setStatus(t("share.status.code_generated"), "success");
  } catch (error) {
    console.error(error);
    setStatus(t("share.status.code_generate_error"), "error");
  }
});

toggleShareBtn?.addEventListener("click", () => {
  shareCodeOutput.type = shareCodeOutput.type === "password" ? "text" : "password";
});

copyShareBtn?.addEventListener("click", async () => {
  if (!shareCodeOutput.value) {
    setStatus(t("share.status.no_code_to_copy"), "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(shareCodeOutput.value);
    setStatus(t("share.status.code_copied"), "success");
  } catch {
    setStatus(t("share.status.code_copy_error"), "error");
  }
});

importShareBtn?.addEventListener("click", async () => {
  const sourceChannel = sourceChannelInput.value.trim().toLowerCase();
  const shareCode = sourceShareCodeInput.value.trim();

  if (!sourceChannel || !shareCode) {
    setStatus(t("share.status.source_and_code_required"), "error");
    return;
  }

  try {
    await importSharedData(session.channel, session.editKeyHash, sourceChannel, shareCode, { preHashed: true });
    setStatus(t("share.status.import_success"), "success");
  } catch (error) {
    console.error(error);
    setStatus(t("share.status.import_error"), "error");
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
}

init();
