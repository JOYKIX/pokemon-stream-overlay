const MANAGED_ROUTES = new Set(["/", "/index.html", "/customize.html", "/share.html", "/options.html"]);
const ROUTE_MODULES = {
    "/": "./app.js",
    "/index.html": "./app.js",
    "/customize.html": "./customize.js",
    "/share.html": "./share.js",
    "/options.html": "./options.js"
};
let activePath = normalizePath(location.pathname);
function normalizePath(pathname) {
    if (!pathname || pathname === "/")
        return "/";
    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
function isManagedUrl(url) {
    return url.origin === location.origin && MANAGED_ROUTES.has(normalizePath(url.pathname));
}
function setLoadingState(loading) {
    document.body.classList.toggle("spa-loading", loading);
}
function replaceContentFromDocument(nextDocument) {
    const nextShell = nextDocument.querySelector(".dashboard-shell");
    const currentShell = document.querySelector(".dashboard-shell");
    if (!nextShell || !currentShell)
        return;
    currentShell.replaceWith(nextShell);
    const nextToast = nextDocument.getElementById("toastStack");
    const currentToast = document.getElementById("toastStack");
    if (currentToast && nextToast) {
        currentToast.replaceWith(nextToast);
    }
    document.title = nextDocument.title;
    document.body.className = nextDocument.body.className;
}
async function bootstrapModuleForPath(pathname) {
    const modulePath = ROUTE_MODULES[pathname];
    if (!modulePath)
        return;
    await import(`${modulePath}?route=${encodeURIComponent(pathname)}&ts=${Date.now()}`);
}
async function navigateTo(url, pushHistory = true) {
    const nextPath = normalizePath(url.pathname);
    if (nextPath === activePath)
        return;
    setLoadingState(true);
    try {
        const response = await fetch(url.pathname);
        if (!response.ok) {
            throw new Error(`Failed to load route ${url.pathname}`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const nextDocument = parser.parseFromString(html, "text/html");
        replaceContentFromDocument(nextDocument);
        if (pushHistory) {
            history.pushState({}, "", nextPath);
        }
        activePath = nextPath;
        await bootstrapModuleForPath(nextPath);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    catch (error) {
        console.error("SPA navigation failed, falling back to hard navigation.", error);
        location.href = url.pathname;
    }
    finally {
        setLoadingState(false);
    }
}
function onDocumentClick(event) {
    const target = event.target;
    const anchor = target?.closest("a[href]");
    if (!anchor)
        return;
    if (anchor.target === "_blank" || anchor.hasAttribute("download"))
        return;
    const url = new URL(anchor.href, location.href);
    if (!isManagedUrl(url))
        return;
    event.preventDefault();
    void navigateTo(url);
}
window.addEventListener("popstate", () => {
    const url = new URL(location.href);
    if (!isManagedUrl(url))
        return;
    void navigateTo(url, false);
});
document.addEventListener("click", onDocumentClick);
if (document.querySelector(".dashboard-shell")) {
    void bootstrapModuleForPath(activePath);
}
