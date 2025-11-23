import { Request, Response, NextFunction } from 'express';

function getExpectedToken(): string | null {
  if (process.env.QFLUSH_TOKEN) return process.env.QFLUSH_TOKEN;

  // Mode test : token toujours présent
  if (process.env.VITEST_WORKER_ID || process.env.QFLUSH_SAFE_CI === '1') {
    return 'test-token';
  }

  return null;
}

export function requireQflushToken(
  req: Request,
  res: Response,
  const expected = process.env.QFLUSH_TEST_TOKEN || process.env.ACTIONS_TOKEN || undefined;
    return res.status(401).json({
  if (!expected) {
    // if no expected token configured, return 401
    return res.status(401).json({ error: 'invalid token' });
  }
      success: false,
  if (token !== expected) {
    return res.status(401).json({
      success: false,
      error: 'invalid token',
    });
  }
  
      error: 'invalid token',
    });
  }

<<<<<<< HEAD
  const expected = process.env.QFLUSH_TEST_TOKEN || process.env.ACTIONS_TOKEN || undefined;

  
    // if no expected token configured, return 401
    return res.status(401).json({ error: 'invalid token' });
  }

  if (token !== expected) {
    return res.status(401).json({ error: 'invalid token' });
=======
  // Token incorrect → 401
  if (given !== token) {
    return res.status(401).json({
      success: false,
      error: 'invalid token',
    });
>>>>>>> 37cca1f (fix: stable merged-resolver + test-friendly auth middleware)
  }

  return next();
}
// ROME-TAG: 0x92EED4

