import { setReloadHandler, callReload } from '../rome/daemon-control';

let called = false;
setReloadHandler(async () => { called = true; });

(async ()=>{
  const ok = await callReload();
  if (!ok || !called) { console.error('reload failed', ok, called); process.exit(2); }
  console.log('daemon control test passed');
  process.exit(0);
})();
