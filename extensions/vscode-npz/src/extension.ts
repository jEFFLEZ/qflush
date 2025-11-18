import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('npz.openScores', () => {
    const panel = vscode.window.createWebviewPanel(
      'npzScores',
      'NPZ Scores',
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

    const cfg = vscode.workspace.getConfiguration('npz');
    const daemonUrl = cfg.get<string>('daemonUrl') || 'http://localhost:4500';
    const token = cfg.get<string>('adminToken') || '';

    // Send config to webview securely via postMessage
    panel.webview.postMessage({ type: 'config', daemonUrl, token });

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message && message.type === 'saveConfig') {
          const cfg = vscode.workspace.getConfiguration('npz');
          await cfg.update('daemonUrl', message.daemonUrl, vscode.ConfigurationTarget.Global);
          await cfg.update('adminToken', message.token, vscode.ConfigurationTarget.Global);
          panel.webview.postMessage({ type: 'saved', info: 'Configuration saved' });
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
