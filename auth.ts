// @ts-nocheck
import { getProfile, verifyProfile } from "./shared.js";

const SESSION_KEY = "pokemonOverlaySessionV2";

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.channel || !parsed?.editKeyHash) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function ensureAuthenticated({ redirectTo = "login.html" } = {}) {
  const session = loadSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }

  const profile = await getProfile(session.channel);
  const valid = await verifyProfile(session.channel, session.editKeyHash, { preHashed: true });
  if (!profile || !valid) {
    clearSession();
    window.location.href = redirectTo;
    return null;
  }

  return session;
}
