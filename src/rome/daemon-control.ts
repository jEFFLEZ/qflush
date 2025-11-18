let reloadHandler: (() => Promise<void> | void) | null = null;

export function setReloadHandler(fn: () => Promise<void> | void) {
  reloadHandler = fn;
}

export async function callReload() {
  try {
    if (reloadHandler) await reloadHandler();
    return true;
  } catch (e) { return false; }
}
