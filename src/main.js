const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
    return { ok: false, error: 'Не найден uxplay.exe. Положи сборку UxPlay в папку resources/uxplay (см. README).' };
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
    send('log', 'Ошибка запуска: ' + e.message + '\n');
    proc = null;
    send('state', { running: false });
  });
  proc.on('exit', (code) => {
    send('log', `UxPlay завершился (код ${code})\n`);
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
  catch (e) { return { ok: false, error: String(e.message || e) }; }
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
    return { ok: false, error: 'Не найден zadig.exe. Он добавляется при сборке установщика.' };
  }
  // Копируем в папку пользователя, чтобы zadig.ini был рядом и доступен для записи
  const dst = path.join(app.getPath('userData'), 'zadig');
  try {
    fs.mkdirSync(dst, { recursive: true });
    fs.cpSync(src, dst, { recursive: true, force: true });
  } catch (e) {
    return { ok: false, error: 'Не удалось подготовить Zadig: ' + e.message };
  }
  const exe = path.join(dst, 'zadig.exe');
  const ps = `Start-Process -FilePath '${exe.replace(/'/g, "''")}' -WorkingDirectory '${dst.replace(/'/g, "''")}' -Verb RunAs`;
  const p = spawn('powershell.exe', ['-NoProfile', '-Command', ps], { windowsHide: true, detached: true, stdio: 'ignore' });
  p.on('error', () => {});
  p.unref();
  return { ok: true };
});
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

app.whenReady().then(createWindow);
app.on('before-quit', stop);
app.on('window-all-closed', () => { stop(); app.quit(); });
