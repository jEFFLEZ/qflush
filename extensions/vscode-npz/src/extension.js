"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
// import Rome tag utilities
const rome_tag_1 = require("@rome/rome-tag");
const TRIAL_DAYS = 14;
function isTrialExpired(context) {
    const started = context.globalState.get('qflush.trialStarted');
    if (!started)
        return false; // start on first use
    const now = Date.now();
    return now - started > TRIAL_DAYS * 24 * 3600 * 1000;
}
function ensureTrialStarted(context) {
    const started = context.globalState.get('qflush.trialStarted');
    if (!started)
        context.globalState.update('qflush.trialStarted', Date.now());
}
function postJson(urlStr, body) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(urlStr);
            const data = JSON.stringify(body || {});
            const opts = {
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
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300)
                            resolve(parsed);
                        else
                            reject(new Error(parsed && parsed.error ? parsed.error : `HTTP ${res.statusCode}`));
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', (err) => reject(err));
            req.write(data);
            req.end();
        }
        catch (e) {
            reject(e);
        }
    });
}
function getJson(urlStr) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(urlStr);
            const lib = url.protocol === 'https:' ? https : http;
            const req = lib.get(urlStr, (res) => {
                let raw = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => (raw += chunk));
                res.on('end', () => {
                    try {
                        const parsed = raw ? JSON.parse(raw) : {};
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300)
                            resolve(parsed);
                        else
                            reject(new Error(parsed && parsed.error ? parsed.error : `HTTP ${res.statusCode}`));
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', (err) => reject(err));
        }
        catch (e) {
            reject(e);
        }
    });
}
async function saveRomeIndexRecord(record) {
    try {
        const root = process.cwd();
        const dir = path.join(root, '.qflush');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const idxFile = path.join(dir, 'rome-index.json');
        let idx = {};
        if (fs.existsSync(idxFile)) {
            try {
                idx = JSON.parse(fs.readFileSync(idxFile, 'utf8') || '{}');
            }
            catch (error_) {
                console.warn('[vscode-npz] failed to parse rome-index.json: ' + String(error_));
                idx = {};
            }
        }
        // normalize path and build canonical record using shared module
        const relPath = (0, rome_tag_1.normalizeRomePath)(record.path);
        const rec = (0, rome_tag_1.makeRomeTagRecord)({ type: record.type, path: relPath });
        idx[rec.path] = rec;
        fs.writeFileSync(idxFile, JSON.stringify(idx, null, 2), 'utf8');
        return { success: true, record: idx[rec.path] };
    }
    catch (e) {
        return { success: false, error: String(e) };
    }
}
function activate(context) {
    ensureTrialStarted(context);
    const openDisposable = vscode.commands.registerCommand('qflush.openPanel', () => {
        if (isTrialExpired(context)) {
            vscode.window.showInformationMessage('QFlush trial expired. Click to purchase a license.', 'Purchase', 'Enter Key').then((v) => {
                if (v === 'Purchase')
                    vscode.env.openExternal(vscode.Uri.parse('https://gumroad.com/l/your-product'));
                if (v === 'Enter Key')
                    vscode.commands.executeCommand('qflush.enterLicense');
            });
            return;
        }
        const panel = vscode.window.createWebviewPanel('qflushPanel', 'QFlush', vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))],
        });
        const htmlPath = path.join(context.extensionPath, 'src', 'panel.html');
        let html = '';
        try {
            html = fs.readFileSync(htmlPath, 'utf8');
        }
        catch (e) {
            html = `<html><body><pre>panel.html not found at ${htmlPath}</pre></body></html>`;
        }
        panel.webview.html = html;
        const cfg = vscode.workspace.getConfiguration('qflush');
        const daemonUrl = cfg.get('daemonUrl') || 'http://localhost:4500';
        const token = cfg.get('adminToken') || '';
        // Send config to webview securely via postMessage
        panel.webview.postMessage({ type: 'config', daemonUrl, token });
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message && message.type === 'saveConfig') {
                const cfg = vscode.workspace.getConfiguration('qflush');
                await cfg.update('daemonUrl', message.daemonUrl, vscode.ConfigurationTarget.Global);
                await cfg.update('adminToken', message.token, vscode.ConfigurationTarget.Global);
                panel.webview.postMessage({ type: 'saved', info: 'Configuration saved' });
            }
        }, undefined, context.subscriptions);
    });
    const openPourparler = vscode.commands.registerCommand('qflush.openPourparler', () => {
        const panel = vscode.window.createWebviewPanel('qflushPourparler', 'Pourparler', vscode.ViewColumn.One, { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))] });
        const htmlPath = path.join(context.extensionPath, 'src', 'pourparler-web.html');
        let html = '';
        try {
            html = fs.readFileSync(htmlPath, 'utf8');
        }
        catch (e) {
            html = `<html><body><pre>pourparler-web.html not found at ${htmlPath}</pre></body></html>`;
        }
        panel.webview.html = html;
        panel.webview.onDidReceiveMessage(async (msg) => {
            try {
                if (msg && msg.type === 'export') {
                    const destUri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(path.join(process.cwd(), msg.filename)), filters: { 'Images': ['png', 'svg'] } });
                    if (!destUri)
                        return;
                    if (msg.format === 'svg') {
                        fs.writeFileSync(destUri.fsPath, msg.data, 'utf8');
                    }
                    else if (msg.format === 'png') {
                        // data url -> binary
                        const base64 = msg.data.split(',')[1];
                        const buf = Buffer.from(base64, 'base64');
                        fs.writeFileSync(destUri.fsPath, buf);
                    }
                    vscode.window.showInformationMessage(`Exported ${msg.filename}`);
                }
                // new messages from pourparler webview
                if (msg && msg.type === 'npzList') {
                    const cfg = vscode.workspace.getConfiguration('qflush');
                    const daemonUrl = cfg.get('daemonUrl') || 'http://localhost:4500';
                    try {
                        const data = await getJson(`${daemonUrl.replace(/\/$/, '')}/npz/checksum/list`);
                        panel.webview.postMessage({ type: 'npzListResult', data });
                    }
                    catch (e) {
                        panel.webview.postMessage({ type: 'npzListResult', data: { success: false, error: String(e) } });
                    }
                }
                if (msg && msg.type === 'npzClear') {
                    const cfg = vscode.workspace.getConfiguration('qflush');
                    const daemonUrl = cfg.get('daemonUrl') || 'http://localhost:4500';
                    try {
                        const resp = await fetch(`${daemonUrl.replace(/\/$/, '')}/npz/checksum/clear`, { method: 'DELETE' });
                        const j = await resp.json();
                        panel.webview.postMessage({ type: 'npzClearResult', data: j });
                    }
                    catch (e) {
                        panel.webview.postMessage({ type: 'npzClearResult', data: { success: false, error: String(e) } });
                    }
                }
                if (msg && msg.type === 'npzIndexTag') {
                    const rec = msg.payload;
                    const r = await saveRomeIndexRecord({ path: rec.path, type: rec.type, tag: rec.tag });
                    panel.webview.postMessage(Object.assign({ type: 'npzIndexTagResult' }, r));
                }
            }
            catch (e) {
                vscode.window.showErrorMessage('Extension message handler failed: ' + String(e));
            }
        }, undefined, context.subscriptions);
    });
    const enterLicense = vscode.commands.registerCommand('qflush.enterLicense', async () => {
        const key = await vscode.window.showInputBox({ prompt: 'Enter your QFlush license key' });
        if (!key)
            return;
        const cfg = vscode.workspace.getConfiguration('qflush');
        const daemonUrl = cfg.get('daemonUrl') || 'http://localhost:4500';
        const activateUrl = `${daemonUrl.replace(/\/$/, '')}/license/activate`;
        const progressOptions = { location: vscode.ProgressLocation.Notification, title: 'Activating QFlush license...', cancellable: false };
        try {
            await vscode.window.withProgress(progressOptions, async () => {
                const res = await postJson(activateUrl, { key });
                // store license info locally in extension globalState
                await context.globalState.update('qflush.licenseKey', key);
                await context.globalState.update('qflush.licenseInfo', res.license || res);
                vscode.window.showInformationMessage('License activated successfully. Thanks!');
            });
        }
        catch (err) {
            vscode.window.showErrorMessage(`License activation failed: ${err && err.message ? err.message : String(err)}`);
        }
    });
    const showStatus = vscode.commands.registerCommand('qflush.showLicenseStatus', async () => {
        const cfg = vscode.workspace.getConfiguration('qflush');
        const daemonUrl = cfg.get('daemonUrl') || 'http://localhost:4500';
        const statusUrl = `${daemonUrl.replace(/\/$/, '')}/license/status`;
        try {
            const res = await getJson(statusUrl);
            if (!res || !res.success) {
                vscode.window.showInformationMessage('No license information available');
                return;
            }
            const lic = res.license;
            if (!lic) {
                vscode.window.showInformationMessage('No local license installed');
                return;
            }
            const exp = lic.expiresAt ? new Date(lic.expiresAt).toLocaleString() : 'never (subscription)';
            vscode.window.showInformationMessage(`License: ${lic.key} product=${lic.product_id} expires=${exp} valid=${res.valid}`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to fetch status: ${err && err.message ? err.message : String(err)}`);
        }
    });
    const openTelemetry = vscode.commands.registerCommand('qflush.openTelemetry', () => {
        const panel = vscode.window.createWebviewPanel('qflushTelemetry', 'QFlush Telemetry', vscode.ViewColumn.Two, { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))] });
        const htmlPath = path.join(context.extensionPath, 'src', 'telemetry-view.html');
        let html = '';
        try {
            html = fs.readFileSync(htmlPath, 'utf8');
        }
        catch (e) {
            html = `<html><body><pre>telemetry-view.html not found at ${htmlPath}</pre></body></html>`;
        }
        panel.webview.html = html;
    });
    context.subscriptions.push(openDisposable, openPourparler, enterLicense, showStatus, openTelemetry);
}
function deactivate() { }
