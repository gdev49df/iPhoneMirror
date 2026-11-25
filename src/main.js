const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const os = require('os');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const usbm = require('./usb');

let win = null;
let proc = null;

function uxplayPath() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'uxplay')
    : path.join(__dirname, '..', 'resources', 'uxplay');
  return { dir: base, exe: path.join(base, 'uxplay.exe') };
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function stop() {
  if (proc) {
    proc.kill();
    proc = null;
  }
  send('state', { running: false });
}

function start(opts) {
  if (proc) return { ok: true };
  const { dir, exe } = uxplayPath();
  if (!fs.existsSync(exe)) {
    return { ok: false, code: 'NO_UXPLAY' };
  }
  const args = ['-n', (opts.name || 'Apple Mirror').trim(), '-nh'];
  if (opts.fullscreen) args.push('-fs');
  if (opts.fps) args.push('-fps', String(opts.fps));
  if (opts.noAudio) args.push('-as', '0');
  if (opts.pin) args.push('-pin');

  proc = spawn(exe, args, { cwd: dir, windowsHide: true });
  send('state', { running: true });
  proc.stdout.on('data', (d) => send('log', d.toString()));
  proc.stderr.on('data', (d) => send('log', d.toString()));
  proc.on('error', (e) => {
    send('log', 'Launch error: ' + e.message + '\n');
    proc = null;
    send('state', { running: false });
  });
  proc.on('exit', (code) => {
    send('log', `UxPlay exited (code ${code})\n`);
    proc = null;
    send('state', { running: false });
  });
  return { ok: true };
}

function createWindow() {
  win = new BrowserWindow({
    width: 760,
    height: 560,
    minWidth: 620,
    minHeight: 480,
    backgroundColor: '#0b0b0f',
    title: 'Apple Mirror',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('start', (_e, opts) => start(opts || {}));
ipcMain.handle('stop', () => { stop(); return { ok: true }; });
ipcMain.handle('usb:list', async () => {
  try { return { ok: true, devices: await usbm.listDevices() }; }
  catch (e) { return { ok: false, code: 'USB_LIST', detail: String(e.message || e) }; }
});
ipcMain.handle('usb:enable', async (_e, d) => {
  const r = await usbm.enableQuickTime(d.address, d.bus);
  if (!r.ok) return r;
  const hit = await usbm.waitQuickTime(d.serial);
  return hit ? { ok: true, ready: true } : { ok: true, ready: false };
});
ipcMain.handle('usb:driver', () => {
  const src = app.isPackaged
    ? path.join(process.resourcesPath, 'zadig')
    : path.join(__dirname, '..', 'resources', 'zadig');
  if (!fs.existsSync(path.join(src, 'zadig.exe'))) {
    return { ok: false, code: 'NO_ZADIG' };
  }
  // Копируем в папку пользователя, чтобы zadig.ini был рядом и доступен для записи
  const dst = path.join(app.getPath('userData'), 'zadig');
  try {
    fs.mkdirSync(dst, { recursive: true });
    fs.cpSync(src, dst, { recursive: true, force: true });
  } catch (e) {
    return { ok: false, code: 'ZADIG_PREP', detail: e.message };
  }
  const exe = path.join(dst, 'zadig.exe');
  const ps = `Start-Process -FilePath '${exe.replace(/'/g, "''")}' -WorkingDirectory '${dst.replace(/'/g, "''")}' -Verb RunAs`;
  const p = spawn('powershell.exe', ['-NoProfile', '-Command', ps], { windowsHide: true, detached: true, stdio: 'ignore' });
  p.on('error', () => {});
  p.unref();
  return { ok: true };
});
const REPO = 'gdev49df/iPhoneMirror';
function newer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}
let lastAsset = null;
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('update:check', async () => {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'apple-mirror' }
    });
    if (!r.ok) return { ok: false, code: 'UPD_HTTP', detail: String(r.status) };
    const j = await r.json();
    const latest = String(j.tag_name || '').replace(/^v/, '');
    const asset = (j.assets || []).find((a) => /\.exe$/i.test(a.name));
    lastAsset = asset ? { url: asset.browser_download_url, name: asset.name } : null;
    return { ok: true, current: app.getVersion(), latest, available: newer(latest, app.getVersion()), page: j.html_url, canInstall: !!asset };
  } catch (e) {
    return { ok: false, code: 'UPD_NET', detail: String(e.message || e) };
  }
});
ipcMain.handle('update:install', async () => {
  if (!lastAsset) return { ok: false, code: 'UPD_NOASSET' };
  try {
    const r = await fetch(lastAsset.url, { headers: { 'User-Agent': 'apple-mirror' } });
    if (!r.ok) return { ok: false, code: 'UPD_HTTP', detail: String(r.status) };
    const file = path.join(os.tmpdir(), lastAsset.name);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    const p = spawn(file, [], { detached: true, stdio: 'ignore' });
    p.on('error', () => {});
    p.unref();
    setTimeout(() => app.quit(), 500);
    return { ok: true };
  } catch (e) {
    return { ok: false, code: 'UPD_NET', detail: String(e.message || e) };
  }
});
ipcMain.handle('open-external', (_e, url) => {
  if (typeof url === 'string' && url.startsWith(`https://github.com/${REPO}/`)) shell.openExternal(url);
});
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

app.whenReady().then(createWindow);
app.on('before-quit', stop);
app.on('window-all-closed', () => { stop(); app.quit(); });
