// Lightweight daemon reload handler
let reloadHandler: (() => void) | null = null;

export function setReloadHandler(fn: () => void) {
  reloadHandler = fn;
}

export function triggerReload() {
  if (reloadHandler) reloadHandler();
}
