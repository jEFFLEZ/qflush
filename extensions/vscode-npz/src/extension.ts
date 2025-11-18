import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';

const TRIAL_DAYS = 14;

function isTrialExpired(context: vscode.ExtensionContext): boolean {
  const started = context.globalState.get<number>('qflash.trialStarted');
  if (!started) return false; // start on first use
  const now = Date.now();
  return now - started > TRIAL_DAYS * 24 * 3600 * 1000;
}

function ensureTrialStarted(context: vscode.ExtensionContext) {
  const started = context.globalState.get<number>('qflash.trialStarted');
  if (!started) context.globalState.update('qflash.trialStarted', Date.now());
}

function postJson(urlStr: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const data = JSON.stringify(body || {});
      const opts: any = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(opts, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : {};
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
            else reject(new Error(parsed && parsed.error ? parsed.error : `HTTP ${res.statusCode}`));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.write(data);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

export function activate(context: vscode.ExtensionContext) {
  ensureTrialStarted(context);

  const openDisposable = vscode.commands.registerCommand('qflash.openPanel', () => {
    if (isTrialExpired(context)) {
      vscode.window.showInformationMessage('QFlash trial expired. Click to purchase a license.', 'Purchase', 'Enter Key').then((v) => {
        if (v === 'Purchase') vscode.env.openExternal(vscode.Uri.parse('https://gumroad.com/l/your-product'));
        if (v === 'Enter Key') vscode.commands.executeCommand('qflash.enterLicense');
      });
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'qflashPanel',
      'QFlash',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))],
      }
    );

    const htmlPath = path.join(context.extensionPath, 'src', 'panel.html');
    let html = '';
    try {
      html = fs.readFileSync(htmlPath, 'utf8');
    } catch (e) {
      html = `<html><body><pre>panel.html not found at ${htmlPath}</pre></body></html>`;
    }

    panel.webview.html = html;

    const cfg = vscode.workspace.getConfiguration('qflash');
    const daemonUrl = cfg.get<string>('daemonUrl') || 'http://localhost:4500';
    const token = cfg.get<string>('adminToken') || '';

    // Send config to webview securely via postMessage
    panel.webview.postMessage({ type: 'config', daemonUrl, token });

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message && message.type === 'saveConfig') {
          const cfg = vscode.workspace.getConfiguration('qflash');
          await cfg.update('daemonUrl', message.daemonUrl, vscode.ConfigurationTarget.Global);
          await cfg.update('adminToken', message.token, vscode.ConfigurationTarget.Global);
          panel.webview.postMessage({ type: 'saved', info: 'Configuration saved' });
        }
      },
      undefined,
      context.subscriptions
    );
  });

  const enterLicense = vscode.commands.registerCommand('qflash.enterLicense', async () => {
    const key = await vscode.window.showInputBox({ prompt: 'Enter your QFlash license key' });
    if (!key) return;

    const cfg = vscode.workspace.getConfiguration('qflash');
    const daemonUrl = cfg.get<string>('daemonUrl') || 'http://localhost:4500';
    const activateUrl = `${daemonUrl.replace(/\/$/, '')}/license/activate`;

    const progressOptions: vscode.ProgressOptions = { location: vscode.ProgressLocation.Notification, title: 'Activating QFlash license...', cancellable: false };
    try {
      await vscode.window.withProgress(progressOptions, async () => {
        const res = await postJson(activateUrl, { key });
        // store license info locally in extension globalState
        await context.globalState.update('qflash.licenseKey', key);
        await context.globalState.update('qflash.licenseInfo', res.license || res);
        vscode.window.showInformationMessage('License activated successfully. Thanks!');
      });
    } catch (err: any) {
      vscode.window.showErrorMessage(`License activation failed: ${err && err.message ? err.message : String(err)}`);
    }
  });

  context.subscriptions.push(openDisposable, enterLicense);
}

export function deactivate() {}
