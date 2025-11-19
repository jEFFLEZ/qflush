import { setReloadHandler, callReload } from '../rome/daemon-control';

let called = false;
setReloadHandler(async () => { called = true; });

(async ()=>{
  const ok = await callReload();
  if (!ok || !called) {
    console.error('reload failed', ok, called);
    if (!process.env.VITEST_WORKER_ID) setTimeout(() => process.exit(2), 50);
    throw new Error('daemon-control test failed');
  }
  console.log('daemon control test passed');
  if (!process.env.VITEST_WORKER_ID) setTimeout(() => process.exit(0), 50);
})();
