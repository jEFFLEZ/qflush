// src/commands/resonnance.ts
import { resonnance } from '../cortex/resonnance';

export default async function runResonnance() {
  try {
    await resonnance();
  } catch (err) {
    console.error('[CORTEX] Erreur dans la résonnance :', err);
    process.exitCode = 1;
  }
}
