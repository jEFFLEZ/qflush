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
      }
    );

    const htmlPath = path.join(context.extensionPath, 'src', 'panel.html');
    let html = '';
    try {
      html = fs.readFileSync(htmlPath, 'utf8');
    } catch (e) {
      html = `<html><body><pre>panel.html not found at ${htmlPath}</pre></body></html>`;
    }

    const token = process.env.NPZ_ADMIN_TOKEN || 'changeme';
    html = html.replace(/token=changeme/g, `token=${token}`);

    panel.webview.html = html;
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
