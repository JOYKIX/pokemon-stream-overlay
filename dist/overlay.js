// @ts-nocheck
import { getChannelFromUrl, subscribeToTeam, subscribeToProfile, fetchPokemonLocalized, translateType, DEFAULT_OVERLAY_STYLE, shouldUsePixelRendering } from "./shared.js";
import { getCurrentLanguage, loadTranslations, t } from "./i18n.js";
const overlayRoot = document.getElementById("overlayRoot");
const overlayTrainer = document.getElementById("overlayTrainer");
const overlayBadge = document.getElementById("overlayBadge");
const overlayTeam = document.getElementById("overlayTeam");
const overlayBadges = document.getElementById("overlayBadges");
const overlayNuzlockeTag = document.getElementById("overlayNuzlockeTag");
const overlayDeathsLabel = document.getElementById("overlayDeathsLabel");
const overlayDeathCount = document.getElementById("overlayDeathCount");
const pathName = window.location.pathname.split("/").pop() || "overlay.html";
const singlePokemonMatch = pathName.match(/^overlaypokemon([1-6])\.html$/i);
const singlePokemonIndex = singlePokemonMatch ? Number(singlePokemonMatch[1]) - 1 : null;
const isSinglePokemonMode = Number.isInteger(singlePokemonIndex);
const isDeathsOnlyMode = /^overlaydeaths\.html$/i.test(pathName);
let latestTeamData = null;
let profileLanguage = getCurrentLanguage();
const isBadgeOnlyPage = window.location.pathname.endsWith("/overlaybadge.html") || window.location.pathname.endsWith("overlaybadge.html");
function getBadgePrefix(badgeGame) {
    const map = {
        kanto: "Badges/Kanto/Badge_",
        johto: "Badges/Johto/Badge_",
        hoenn: "Badges/Hoenn/Badge_",
        sinnoh: "Badges/Sinnoh/Badge_",
        unys_bw: "Badges/Unys/BW/Badge_",
        unys_b2w2: "Badges/Unys/B2W2/Badge_",
        kalos: "Badges/Kalos/Badge_",
        galar_epee: "Badges/Galar/Badge_",
        galar_bouclier: "Badges/Galar/Badge_"
    };
    return map[badgeGame] || "";
}
function getBadgeSuffix(badgeGame) {
    if (badgeGame === "unys_bw")
        return "_Unys_BW.png";
    if (badgeGame === "unys_b2w2")
        return "_Unys_B2W2.png";
    if (badgeGame === "galar_epee")
        return "_Galar_Epee.png";
    if (badgeGame === "galar_bouclier")
        return "_Galar_Bouclier.png";
    const region = { kanto: "Kanto", johto: "Johto", hoenn: "Hoenn", sinnoh: "Sinnoh", kalos: "Kalos" }[badgeGame];
    return region ? `_${region}.png` : "";
}
function renderBadges(badgeGame, badgeCount, enabled, badgeManual = "") {
    if (!overlayBadges)
        return;
    if (badgeGame === "paldea") {
        if (!enabled) {
            overlayBadges.style.display = "none";
            overlayBadges.innerHTML = "";
            return;
        }
        const orderedBadges = [
            "Arene/Badge_Insecte_Paldea.png",
            "Arene/Badge_Plante_Paldea.png",
            "Arene/Badge_Electrik_Paldea.png",
            "Arene/Badge_Eau_Paldea.png",
            "Arene/Badge_Normal_Paldea.png",
            "Arene/Badge_Spectre_Paldea.png",
            "Arene/Badge_Psy_Paldea.png",
            "Arene/Badge_Glace_Paldea.png",
            "Dominant/Badge_Roche_Paldea.png",
            "Dominant/Badge_Vol_Paldea.png",
            "Dominant/Badge_Acier_Paldea.png",
            "Dominant/Badge_Sol_Paldea.png",
            "Dominant/Badge_Dragon_Paldea.png",
            "Team/Badge_Tenebres_Paldea.png",
            "Team/Badge_Feu_Paldea.png",
            "Team/Badge_Poison_Paldea.png",
            "Team/Badge_Fee_Paldea.png",
            "Team/Badge_Combat_Paldea.png"
        ];
        const selected = new Set(String(badgeManual || "").split(",").map((it) => it.trim()).filter(Boolean));
        const obtained = Math.max(0, Math.min(18, Number(badgeCount) || 0));
        overlayBadges.style.display = "grid";
        overlayBadges.innerHTML = orderedBadges.map((relativePath, i) => {
            const baseName = relativePath.replace(".png", "").split("/").pop();
            const locked = (selected.size ? !selected.has(baseName) : i >= obtained) ? "is-locked" : "";
            return `<img class="overlay-badge-item ${locked}" src="./Badges/Paldea/${relativePath}" alt="${baseName}" loading="lazy" decoding="async">`;
        }).join("");
        return;
    }
    const prefix = getBadgePrefix(badgeGame);
    const suffix = getBadgeSuffix(badgeGame);
    if (!enabled || !prefix || !suffix) {
        overlayBadges.style.display = "none";
        overlayBadges.innerHTML = "";
        return;
    }
    overlayBadges.style.display = "grid";
    const obtained = Math.max(0, Math.min(8, Number(badgeCount) || 0));
    overlayBadges.innerHTML = Array.from({ length: 8 }, (_, i) => {
        const index = i + 1;
        const locked = index > obtained ? "is-locked" : "";
        return `<img class="overlay-badge-item ${locked}" src="./${prefix}${index}${suffix}" alt="Badge ${index}" loading="lazy" decoding="async">`;
    }).join("");
}
function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    if (normalized.length !== 6)
        return { r: 10, g: 10, b: 10 };
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
    const normalizedType = String(type || "").toLowerCase().trim();
    const typeLogoByApiName = {
        normal: "type_normal.png",
        fire: "type_feu.png",
        water: "type_eau.png",
        electric: "type_electrik.png",
        grass: "type_plante.png",
        ice: "type_glace.png",
        fighting: "type_combat.png",
        poison: "type_poison.png",
        ground: "type_sol.png",
        flying: "type_vol.png",
        psychic: "type_psy.png",
        bug: "type_insecte.png",
        rock: "type_roche.png",
        ghost: "type_spectre.png",
        dragon: "type_dragon.png",
        dark: "type_tenebres.png",
        steel: "type_acier.png",
        fairy: "type_fee.png"
    };
    const typeLogo = typeLogoByApiName[normalizedType];
    if (!typeLogo) {
        return `<span class="type-pill type-fallback">${translateType(type)}</span>`;
    }
    return `<img class="type-logo" src="./logo_type/${typeLogo}" alt="${translateType(type)}" loading="lazy" decoding="async">`;
}
function sanitizeCardLayout(layout) {
    const sanitizePoint = (point) => ({
        x: Math.max(-120, Math.min(120, Number(point?.x) || 0)),
        y: Math.max(-120, Math.min(120, Number(point?.y) || 0))
    });
    return {
        pokeball: sanitizePoint(layout?.pokeball),
        sprite: sanitizePoint(layout?.sprite),
        level: sanitizePoint(layout?.level),
        types: sanitizePoint(layout?.types)
    };
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
        overlayRoot.classList.remove("sprite-only-mode", "hide-header", "single-slot-mode", "deaths-only-mode");
        overlayRoot.style.setProperty("--overlay-sprite-scale", "1");
        overlayTrainer.textContent = t("overlay.no_team");
        overlayBadge.textContent = t("overlay.waiting_data");
        overlayNuzlockeTag.style.display = "none";
        overlayTeam.innerHTML = "";
        renderBadges("none", 0, false);
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
        showPokeball: data.displayOptions?.showPokeball ?? true,
        spriteVariant: data.displayOptions?.spriteVariant || "auto",
        preferAnimatedSprite: Boolean(data.displayOptions?.preferAnimatedSprite),
        spriteOnlyMode: Boolean(data.displayOptions?.spriteOnlyMode),
        spriteScale: Math.max(0.5, Math.min(10, Number(data.displayOptions?.spriteScale) || 1)),
        editorResolution: data.displayOptions?.editorResolution || { width: 1920, height: 1080 },
        slotPositions: data.displayOptions?.slotPositions || [],
        slotScales: data.displayOptions?.slotScales || [],
        showNuzlockeLabel: data.displayOptions?.showNuzlockeLabel ?? true,
        pokemonNameLanguage: data.displayOptions?.pokemonNameLanguage || "auto",
        cardLayout: sanitizeCardLayout(data.displayOptions?.cardLayout),
        badgeGame: data.displayOptions?.badgeGame || "none",
        badgeCount: data.displayOptions?.badgeCount ?? 0,
        badgeManual: data.displayOptions?.badgeManual || "",
        showBadges: Boolean(data.displayOptions?.showBadges)
    };
    applyOverlayStyle(data.overlayStyle, options);
    overlayRoot.classList.toggle("single-slot-mode", isSinglePokemonMode);
    overlayRoot.classList.toggle("deaths-only-mode", isDeathsOnlyMode);
    overlayRoot.classList.toggle("sprite-only-mode", options.spriteOnlyMode);
    overlayRoot.style.setProperty("--overlay-sprite-scale", String(options.spriteScale));
    overlayRoot.style.setProperty("--layout-pokeball-x", `${options.cardLayout.pokeball.x}px`);
    overlayRoot.style.setProperty("--layout-pokeball-y", `${options.cardLayout.pokeball.y}px`);
    overlayRoot.style.setProperty("--layout-sprite-x", `${options.cardLayout.sprite.x}px`);
    overlayRoot.style.setProperty("--layout-sprite-y", `${options.cardLayout.sprite.y}px`);
    overlayRoot.style.setProperty("--layout-level-x", `${options.cardLayout.level.x}px`);
    overlayRoot.style.setProperty("--layout-level-y", `${options.cardLayout.level.y}px`);
    overlayRoot.style.setProperty("--layout-types-x", `${options.cardLayout.types.x}px`);
    overlayRoot.style.setProperty("--layout-types-y", `${options.cardLayout.types.y}px`);
    overlayRoot.classList.toggle("hide-header", !options.showHeader);
    overlayRoot.classList.toggle("badge-only-mode", isBadgeOnlyPage);
    renderBadges(options.badgeGame, options.badgeCount, options.showBadges, options.badgeManual);
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
        if (isDeathsOnlyMode) {
            overlayNuzlockeTag.style.left = "50%";
            overlayNuzlockeTag.style.top = "50%";
        }
        else {
            overlayNuzlockeTag.style.left = `${nPos.x}%`;
            overlayNuzlockeTag.style.top = `${nPos.y}%`;
        }
    }
    else {
        overlayNuzlockeTag.style.display = "none";
    }
    overlayTeam.innerHTML = "";
    if (isBadgeOnlyPage)
        return;
    const slots = data.slots || [];
    const allowedSlotIndex = isSinglePokemonMode ? singlePokemonIndex : null;
    for (let index = 0; index < 6; index++) {
        if (allowedSlotIndex !== null && index !== allowedSlotIndex)
            continue;
        const slot = slots[index];
        if (!slot?.name)
            continue;
        let pokemon = null;
        try {
            pokemon = await fetchPokemonLocalized(slot.name, slot.shiny, {
                form: slot.form,
                variant: options.spriteVariant,
                animated: options.preferAnimatedSprite,
                nameLanguage: options.pokemonNameLanguage === "auto" ? profileLanguage : options.pokemonNameLanguage
            });
        }
        catch {
            pokemon = null;
        }
        const pos = isSinglePokemonMode ? { x: 50, y: 50 } : getPosition(options, index);
        const sprite = pokemon?.sprite || pokemon?.artwork || "";
        const pixelSpriteClass = shouldUsePixelRendering(options.spriteVariant, options.preferAnimatedSprite) ? "pixel-sprite-mode" : "";
        const cardClass = options.spriteOnlyMode
            ? `overlay-card cardless ${pixelSpriteClass}`.trim()
            : `overlay-card ${pixelSpriteClass}`.trim();
        const scale = isSinglePokemonMode ? 1 : Math.max(0.6, Math.min(2, Number(options.slotScales?.[index]) || 1));
        const nickname = slot.nickname?.trim();
        const hasNickname = Boolean(nickname);
        const form = slot.form?.trim();
        const displayForm = form ? ` (${form})` : "";
        const displaySpecies = `${pokemon?.displayName || slot.name}${displayForm}`;
        const nameHtml = options.showName
            ? `<div class="overlay-name-wrap"><div class="overlay-name-panel">${options.showNickname && hasNickname ? `<div class="overlay-name">${nickname}</div>` : ""}<div class="overlay-species ${!options.showNickname || !hasNickname ? "is-primary" : ""}">${displaySpecies}</div></div></div>`
            : "";
        const levelHtml = options.showLevel && slot.level ? `<div class="overlay-level">Lv.${slot.level}</div>` : "";
        const shinyHtml = options.showShiny && slot.shiny ? '<span class="meta-pill shiny"><span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span>Shiny</span>' : "";
        const itemHtml = options.showItem && slot.item ? `<span class="meta-pill item">${slot.item}</span>` : "";
        const typesHtml = options.showTypes && pokemon?.types?.length ? `<div class="overlay-types">${pokemon.types.map(renderTypeBadge).join("")}</div>` : "";
        overlayTeam.insertAdjacentHTML("beforeend", `<article class="${cardClass}" style="left:${pos.x}%; top:${pos.y}%; --slot-scale:${scale}">
        <div class="overlay-card-top">${levelHtml}</div>
        <div class="overlay-image-wrap">${options.showPokeball ? '<img class="overlay-pokeball" src="./pokeball.png" alt="" aria-hidden="true">' : ""}${sprite ? `<img src="${sprite}" alt="${pokemon?.displayName || slot.name}">` : ""}</div>
        ${nameHtml}
        <div class="overlay-meta">${shinyHtml}${itemHtml}</div>
        ${typesHtml}
      </article>`);
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
    if (event.key !== "pokemonOverlayUiLang")
        return;
    renderTeam(latestTeamData);
});
