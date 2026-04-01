import {
  getChannelFromUrl,
  subscribeToTeam,
  subscribeToProfile,
  fetchPokemonLocalized,
  translateType,
  DEFAULT_OVERLAY_STYLE,
  shouldUsePixelRendering
} from "./shared.js";
import { getCurrentLanguage, loadTranslations, t } from "./i18n.js";

const overlayRoot = document.getElementById("overlayRoot");
const overlayTrainer = document.getElementById("overlayTrainer");
const overlayBadge = document.getElementById("overlayBadge");
const overlayTeam = document.getElementById("overlayTeam");
const overlayNuzlockeTag = document.getElementById("overlayNuzlockeTag");
const overlayDeathsLabel = document.getElementById("overlayDeathsLabel");
const overlayDeathCount = document.getElementById("overlayDeathCount");


let latestTeamData = null;
let profileLanguage = getCurrentLanguage();

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 10, g: 10, b: 10 };
  return { r: Number.parseInt(normalized.slice(0, 2), 16), g: Number.parseInt(normalized.slice(2, 4), 16), b: Number.parseInt(normalized.slice(4, 6), 16) };
}

function applyOverlayStyle(style = {}, options = {}) {
  const merged = { ...DEFAULT_OVERLAY_STYLE, ...style };
  const rgb = hexToRgb(merged.backgroundColor);
  const isPokeballSlotBackground = typeof merged.backgroundImage === "string"
    && /(^|\/)pokeball\.png$/i.test(merged.backgroundImage.trim());
  const hasBackgroundImage = typeof merged.backgroundImage === "string"
    && !isPokeballSlotBackground
    && (merged.backgroundImage.startsWith("data:image/") || merged.backgroundImage.endsWith(".png"));

  document.body.style.backgroundColor = merged.transparentBackground
    ? "transparent"
    : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${merged.backgroundOpacity})`;
  document.body.style.backgroundImage = "none";
  document.body.style.backgroundPosition = "center center";
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundRepeat = "no-repeat";

  overlayRoot.classList.toggle("overlay-transparent-bg", Boolean(merged.transparentBackground));
  overlayRoot.classList.toggle("has-bg-image", hasBackgroundImage && !merged.transparentBackground);
  overlayRoot.style.setProperty("--overlay-bg", merged.backgroundColor);
  overlayRoot.style.setProperty("--overlay-bg-opacity", String(merged.transparentBackground ? 0 : merged.backgroundOpacity));
  overlayRoot.style.setProperty("--overlay-bg-image", hasBackgroundImage ? `url("${merged.backgroundImage}")` : "none");
  overlayRoot.style.setProperty("--overlay-bg-size", `${Math.max(20, Math.min(200, Number(merged.backgroundImageSize) || 100))}% auto`);
  overlayRoot.style.setProperty("--overlay-text", merged.textColor);
  overlayRoot.style.setProperty("--overlay-accent", merged.accentColor);
  overlayRoot.style.setProperty("--overlay-card", merged.cardColor);
  overlayRoot.style.setProperty("--overlay-card-opacity", String(merged.cardOpacity));
  overlayRoot.style.setProperty("--overlay-radius", `${merged.borderRadius}px`);

  const streamWidth = Math.max(640, Number(options.editorResolution?.width) || 1920);
  const streamHeight = Math.max(360, Number(options.editorResolution?.height) || 1080);
  overlayRoot.style.setProperty("--stream-width", String(streamWidth));
  overlayRoot.style.setProperty("--stream-height", String(streamHeight));
}

function renderTypeBadge(type) {
  const safeType = String(type || "").toLowerCase().replace(/[^a-z]/g, "");
  return `<span class="type-pill type-${safeType}">${translateType(type)}</span>`;
}

function getPosition(options, index) {
  const positions = options.slotPositions;
  const defaultPos = [
    { x: 10, y: 20 },
    { x: 40, y: 20 },
    { x: 70, y: 20 },
    { x: 10, y: 62 },
    { x: 40, y: 62 },
    { x: 70, y: 62 },
    { x: 88, y: 12 }
  ];

  if (Array.isArray(positions) && positions[index]) {
    return {
      x: Math.max(0, Math.min(100, Number(positions[index].x) || 0)),
      y: Math.max(0, Math.min(100, Number(positions[index].y) || 0))
    };
  }
  return defaultPos[index] || { x: 10, y: 10 };
}

async function renderTeam(data) {
  await loadTranslations(profileLanguage);
  if (!data) {
    applyOverlayStyle(DEFAULT_OVERLAY_STYLE, {});
    overlayRoot.classList.remove("sprite-only-mode", "hide-header");
    overlayRoot.style.setProperty("--overlay-sprite-scale", "1");
    overlayTrainer.textContent = t("overlay.no_team");
    overlayBadge.textContent = t("overlay.waiting_data");
    overlayNuzlockeTag.style.display = "none";
    overlayTeam.innerHTML = "";
    return;
  }

  const options = {
    showHeader: data.displayOptions?.showHeader ?? true,
    showName: data.displayOptions?.showName ?? true,
    showNickname: data.displayOptions?.showNickname ?? true,
    showLevel: data.displayOptions?.showLevel ?? true,
    showItem: data.displayOptions?.showItem ?? true,
    showShiny: data.displayOptions?.showShiny ?? true,
    showTypes: data.displayOptions?.showTypes ?? true,
    spriteVariant: data.displayOptions?.spriteVariant || "auto",
    preferAnimatedSprite: Boolean(data.displayOptions?.preferAnimatedSprite),
    spriteOnlyMode: Boolean(data.displayOptions?.spriteOnlyMode),
    spriteScale: Math.max(0.5, Math.min(10, Number(data.displayOptions?.spriteScale) || 1)),
    editorResolution: data.displayOptions?.editorResolution || { width: 1920, height: 1080 },
    slotPositions: data.displayOptions?.slotPositions || [],
    slotScales: data.displayOptions?.slotScales || [],
    showNuzlockeLabel: data.displayOptions?.showNuzlockeLabel ?? true,
    pokemonNameLanguage: data.displayOptions?.pokemonNameLanguage || "auto"
  };

  applyOverlayStyle(data.overlayStyle, options);
  overlayRoot.classList.toggle("sprite-only-mode", options.spriteOnlyMode);
  overlayRoot.style.setProperty("--overlay-sprite-scale", String(options.spriteScale));
  overlayRoot.classList.toggle("hide-header", !options.showHeader);

  overlayTrainer.textContent = data.trainerName || t("common.default_trainer");
  overlayBadge.textContent = data.badgeText || t("common.default_badge");

  const nuzlockeOn = Boolean(data.nuzlockeMode);
  const deathCount = Math.max(0, Number(data.deathCount) || 0);
  const deathTier = deathCount >= 10 ? "critical" : deathCount >= 5 ? "warning" : "normal";
  overlayDeathsLabel.textContent = t("overlay.deaths");
  overlayDeathCount.textContent = String(deathCount);
  overlayNuzlockeTag.dataset.deathTier = deathTier;
  overlayNuzlockeTag.classList.toggle("hide-run-label", !options.showNuzlockeLabel);
  if (nuzlockeOn) {
    const nPos = getPosition(options, 6);
    overlayNuzlockeTag.style.display = "inline-flex";
    overlayNuzlockeTag.style.left = `${nPos.x}%`;
    overlayNuzlockeTag.style.top = `${nPos.y}%`;
  } else {
    overlayNuzlockeTag.style.display = "none";
  }

  overlayTeam.innerHTML = "";
  const slots = data.slots || [];

  for (let index = 0; index < 6; index++) {
    const slot = slots[index];
    if (!slot?.name) continue;

    let pokemon = null;
    try {
      pokemon = await fetchPokemonLocalized(slot.name, slot.shiny, {
        variant: options.spriteVariant,
        animated: options.preferAnimatedSprite,
        nameLanguage: options.pokemonNameLanguage === "auto" ? profileLanguage : options.pokemonNameLanguage
      });
    } catch {
      pokemon = null;
    }

    const pos = getPosition(options, index);
    const sprite = pokemon?.sprite || pokemon?.artwork || "";
    const pixelSpriteClass = shouldUsePixelRendering(options.spriteVariant, options.preferAnimatedSprite) ? "pixel-sprite-mode" : "";
    const cardClass = options.spriteOnlyMode
      ? `overlay-card cardless ${pixelSpriteClass}`.trim()
      : `overlay-card ${pixelSpriteClass}`.trim();
    const scale = Math.max(0.6, Math.min(2, Number(options.slotScales?.[index]) || 1));
    const nickname = slot.nickname?.trim();
    const hasNickname = Boolean(nickname);

    const nameHtml = options.showName
      ? `<div class="overlay-name-wrap"><div class="overlay-name-panel">${options.showNickname && hasNickname ? `<div class="overlay-name">${nickname}</div>` : ""}<div class="overlay-species ${!options.showNickname || !hasNickname ? "is-primary" : ""}">${pokemon?.displayName || slot.name}</div></div></div>`
      : "";

    const levelHtml = options.showLevel && slot.level ? `<div class="overlay-level">Lv.${slot.level}</div>` : "";
    const shinyHtml = options.showShiny && slot.shiny ? '<span class="meta-pill shiny"><span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span>Shiny</span>' : "";
    const itemHtml = options.showItem && slot.item ? `<span class="meta-pill item">${slot.item}</span>` : "";
    const typesHtml = options.showTypes && pokemon?.types?.length ? `<div class="overlay-types">${pokemon.types.map(renderTypeBadge).join("")}</div>` : "";

    overlayTeam.insertAdjacentHTML(
      "beforeend",
      `<article class="${cardClass}" style="left:${pos.x}%; top:${pos.y}%; --slot-scale:${scale}">
        <div class="overlay-card-top">${levelHtml}</div>
        <div class="overlay-image-wrap">${sprite ? `<img src="${sprite}" alt="${pokemon?.displayName || slot.name}">` : ""}</div>
        ${nameHtml}
        <div class="overlay-meta">${shinyHtml}${itemHtml}</div>
        ${typesHtml}
      </article>`
    );
  }
}

const channel = getChannelFromUrl("joykix");
subscribeToTeam(channel, (data) => {
  latestTeamData = data;
  renderTeam(data);
});

subscribeToProfile(channel, (profile) => {
  profileLanguage = profile?.uiLanguage || getCurrentLanguage();
  renderTeam(latestTeamData);
});

window.addEventListener("app-language-changed", () => {
  renderTeam(latestTeamData);
});

window.addEventListener("storage", (event) => {
  if (event.key !== "pokemonOverlayUiLang") return;
  renderTeam(latestTeamData);
});
