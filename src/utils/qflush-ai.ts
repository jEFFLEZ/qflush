import { spawn } from 'child_process';

export type AiMode = 'cloud' | 'local' | 'auto';

export interface QflushAiOptions {
  prompt: string;
  profile?: string;
  mode?: AiMode;
}

function buildArgs(options: QflushAiOptions): string[] {
  const args = ['ai', 'prompt', options.prompt];
  if (options.profile) args.push('--profile', options.profile);
  if (options.mode) args.push('--mode', options.mode);
  return args;
}

async function runOpenAiCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    let proc;
    try {
      proc = spawn('openai', args, { shell: false });
    } catch (error) {
      reject(error);
      return;
    }

    if (proc.stdout) {
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
    }

    proc.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `openai CLI exited with code ${code}`));
    });
  });
}

export async function qflushAi(options: QflushAiOptions): Promise<string> {
  const mode = options.mode || 'auto';
  const profile = options.profile || 'default';
  if (mode === 'local' || mode === 'auto') {
    try {
      const args = buildArgs({ ...options, mode: 'local', profile });
      const localResult = await runOpenAiCli(args);
      if (localResult) return localResult;
      if (mode === 'local') throw new Error('Local AI failed');
    } catch (e) {
      if (mode === 'local') throw e;
      // fallback to cloud
    }
  }
  // fallback to cloud
  const args = buildArgs({ ...options, mode: 'cloud', profile });
  return await runOpenAiCli(args);
}
