export async function executeAction(action: string, ctx: any = {}) {
  return { success: true, action, ctx, stub: true };
}

export async function execCommand(cmd: string, args: string[] = []) {
  return { code: 0, stdout: '', stderr: '', stub: true };
}

export default { executeAction, execCommand };
