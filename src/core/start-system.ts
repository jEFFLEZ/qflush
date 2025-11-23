import { QFLUSH_MODE } from './qflush-mode';

export async function startQflushSystem() {
  if (QFLUSH_MODE !== 'daemon') {
    try {
      const m = await import('../cortex/bus');
      if (m && typeof m.startCortexBus === 'function') {
        console.log('[QFLUSH] starting CORTEX bus');
        m.startCortexBus();
      }
    } catch (e) {
      console.warn('[QFLUSH] failed to start CORTEX bus (continuing):', String(e));
    }
  }

  if (QFLUSH_MODE !== 'cortex') {
    try {
      const m = await import('../daemon/qflushd');
      if (m && typeof m.startServer === 'function') {
        console.log('[QFLUSH] starting legacy daemon server');
        // start daemon on configured port in-process (non-detached)
        const port = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : undefined;
        m.startServer(port);
      }
    } catch (e) {
      console.warn('[QFLUSH] failed to start legacy daemon (continuing):', String(e));
    }
  }
}
