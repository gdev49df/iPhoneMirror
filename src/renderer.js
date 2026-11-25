const $ = (id) => document.getElementById(id);

// ---------- переводы ----------
const I18N = {
  ru: {
    status_stopped: 'Остановлено', status_waiting: 'Ожидает подключения',
    start: 'Запустить', stop: 'Остановить',
    name: 'Имя в списке AirPlay', fps: 'Частота кадров', fullscreen: 'Полный экран', noaudio: 'Без звука', pin: 'Запрашивать PIN',
    air1: 'Подключи ПК и iPhone к одной Wi-Fi сети.', air2: 'Нажми «Запустить».',
    air3: 'На iPhone: Пункт управления → Повтор экрана → выбери имя устройства.',
    usb1: 'Подключи iPhone кабелем и разблокируй его, на вопрос «Доверять этому компьютеру?» ответь «Доверять».',
    usb2: 'Нажми «Обновить», затем «Включить захват» у своего устройства.',
    refresh: 'Обновить', install_driver: 'Установить драйвер',
    driver_help: 'В окне Zadig: меню <b>Options → List All Devices</b> (если не включено), выбери свой iPhone («Apple Mobile Device USB Composite Device» или «iPhone»), слева от кнопки должен стоять <b>WinUSB</b>, нажми <b>Replace Driver</b> и дождись успеха. Потом вернись сюда и нажми «Обновить». Пока стоит WinUSB, iTunes и Apple Devices этот iPhone не видят; вернуть можно в Диспетчере устройств (откат драйвера).',
    usb_searching: 'Ищу устройства…', usb_none: 'iPhone/iPad не найден. Проверь кабель и разблокируй устройство.',
    usb_dev: 'Устройство Apple', usb_noaccess: 'Нет доступа по USB: нужен драйвер', usb_serial: 'Серийный номер: ', usb_unknown: 'неизвестен',
    usb_ready: 'Режим захвата включён', usb_enable: 'Включить захват', usb_enabling: 'Включаю режим захвата…',
    usb_done: 'Готово: устройство в режиме захвата.', usb_notready: 'Запрос принят, но режим не появился. Переподключи кабель и повтори.',
    zadig_started: 'Zadig запущен (подтверди запрос Windows).',
    err_NO_UXPLAY: 'Не найден uxplay.exe. Положи сборку UxPlay в папку resources/uxplay.',
    err_NO_ZADIG: 'Не найден zadig.exe. Он добавляется при сборке установщика.',
    err_ZADIG_PREP: 'Не удалось подготовить Zadig: ', err_USB_LIST: 'Ошибка USB: ',
    err_NOT_FOUND: 'Устройство не найдено. Переподключи кабель.',
    err_NEED_DRIVER: 'Не удалось открыть устройство по USB, нужен драйвер WinUSB (кнопка «Установить драйвер»): ',
    err_REJECTED: 'Запрос отклонён: ',
    check_updates: 'Проверить обновления', upd_checking: 'Проверяю обновления…',
    upd_latest: 'У вас последняя версия: ', upd_available: 'Доступна новая версия: ', upd_current: ' (сейчас ',
    upd_install: 'Скачать и установить', upd_page: 'Страница релиза', upd_downloading: 'Скачиваю установщик…',
    err_UPD_NET: 'Не удалось проверить обновления (нет сети?): ', err_UPD_HTTP: 'Ошибка проверки обновлений, код: ',
    err_UPD_NOASSET: 'В релизе нет установщика.',
    log_exit: 'UxPlay завершился (код ', log_err: 'Ошибка запуска: ',
    footer: 'Разработано GwebStudio'
  },
  en: {
    status_stopped: 'Stopped', status_waiting: 'Waiting for connection',
    start: 'Start', stop: 'Stop',
    name: 'Name in AirPlay list', fps: 'Frame rate', fullscreen: 'Fullscreen', noaudio: 'No audio', pin: 'Require PIN',
    air1: 'Connect your PC and iPhone to the same Wi-Fi network.', air2: 'Click “Start”.',
    air3: 'On iPhone: Control Center → Screen Mirroring → pick the device name.',
    usb1: 'Connect the iPhone with a cable and unlock it; answer “Trust This Computer?” with “Trust”.',
    usb2: 'Click “Refresh”, then “Enable capture” next to your device.',
    refresh: 'Refresh', install_driver: 'Install driver',
    driver_help: 'In the Zadig window: menu <b>Options → List All Devices</b> (if not enabled), pick your iPhone (“Apple Mobile Device USB Composite Device” or “iPhone”), make sure <b>WinUSB</b> is selected left of the button, click <b>Replace Driver</b> and wait for success. Then come back here and click “Refresh”. While WinUSB is installed, iTunes and Apple Devices cannot see this iPhone; you can roll it back in Device Manager (Roll Back Driver).',
    usb_searching: 'Searching for devices…', usb_none: 'No iPhone/iPad found. Check the cable and unlock the device.',
    usb_dev: 'Apple device', usb_noaccess: 'No USB access: driver required', usb_serial: 'Serial number: ', usb_unknown: 'unknown',
    usb_ready: 'Capture mode enabled', usb_enable: 'Enable capture', usb_enabling: 'Enabling capture mode…',
    usb_done: 'Done: the device is in capture mode.', usb_notready: 'Request accepted, but capture mode did not appear. Replug the cable and try again.',
    zadig_started: 'Zadig started (confirm the Windows prompt).',
    err_NO_UXPLAY: 'uxplay.exe not found. Put the UxPlay build into resources/uxplay.',
    err_NO_ZADIG: 'zadig.exe not found. It is added when the installer is built.',
    err_ZADIG_PREP: 'Could not prepare Zadig: ', err_USB_LIST: 'USB error: ',
    err_NOT_FOUND: 'Device not found. Replug the cable.',
    err_NEED_DRIVER: 'Could not open the device over USB, the WinUSB driver is required (use “Install driver”): ',
    err_REJECTED: 'Request rejected: ',
    check_updates: 'Check for updates', upd_checking: 'Checking for updates…',
    upd_latest: 'You have the latest version: ', upd_available: 'New version available: ', upd_current: ' (current ',
    upd_install: 'Download and install', upd_page: 'Release page', upd_downloading: 'Downloading installer…',
    err_UPD_NET: 'Could not check for updates (no network?): ', err_UPD_HTTP: 'Update check failed, code: ',
    err_UPD_NOASSET: 'The release has no installer.',
    log_exit: 'UxPlay exited (code ', log_err: 'Launch error: ',
    footer: 'Developed by GwebStudio'
  },
  zh: {
    status_stopped: '已停止', status_waiting: '等待连接',
    start: '启动', stop: '停止',
    name: 'AirPlay 列表中的名称', fps: '帧率', fullscreen: '全屏', noaudio: '静音', pin: '需要 PIN 码',
    air1: '让电脑和 iPhone 连接同一个 Wi-Fi 网络。', air2: '点击“启动”。',
    air3: '在 iPhone 上：控制中心 → 屏幕镜像 → 选择设备名称。',
    usb1: '用数据线连接 iPhone 并解锁，出现“信任此电脑？”时选择“信任”。',
    usb2: '点击“刷新”，然后点击你的设备旁的“启用捕获”。',
    refresh: '刷新', install_driver: '安装驱动',
    driver_help: '在 Zadig 窗口中：菜单 <b>Options → List All Devices</b>（如未启用），选择你的 iPhone（“Apple Mobile Device USB Composite Device”或“iPhone”），确认按钮左侧为 <b>WinUSB</b>，点击 <b>Replace Driver</b> 并等待成功。然后回到这里点击“刷新”。安装 WinUSB 后，iTunes 和 Apple Devices 将无法识别该 iPhone；可在设备管理器中回滚驱动。',
    usb_searching: '正在查找设备…', usb_none: '未找到 iPhone/iPad。请检查数据线并解锁设备。',
    usb_dev: 'Apple 设备', usb_noaccess: '无法通过 USB 访问：需要驱动', usb_serial: '序列号：', usb_unknown: '未知',
    usb_ready: '捕获模式已启用', usb_enable: '启用捕获', usb_enabling: '正在启用捕获模式…',
    usb_done: '完成：设备已进入捕获模式。', usb_notready: '请求已接受，但未进入捕获模式。请重新插拔数据线后重试。',
    zadig_started: 'Zadig 已启动（请确认 Windows 提示）。',
    err_NO_UXPLAY: '未找到 uxplay.exe。请将 UxPlay 放入 resources/uxplay 文件夹。',
    err_NO_ZADIG: '未找到 zadig.exe。它会在构建安装程序时添加。',
    err_ZADIG_PREP: '无法准备 Zadig：', err_USB_LIST: 'USB 错误：',
    err_NOT_FOUND: '未找到设备。请重新插拔数据线。',
    err_NEED_DRIVER: '无法通过 USB 打开设备，需要 WinUSB 驱动（点击“安装驱动”）：',
    err_REJECTED: '请求被拒绝：',
    check_updates: '检查更新', upd_checking: '正在检查更新…',
    upd_latest: '已是最新版本：', upd_available: '有新版本：', upd_current: '（当前 ',
    upd_install: '下载并安装', upd_page: '发布页面', upd_downloading: '正在下载安装程序…',
    err_UPD_NET: '无法检查更新（没有网络？）：', err_UPD_HTTP: '检查更新失败，代码：',
    err_UPD_NOASSET: '该版本没有安装程序。',
    log_exit: 'UxPlay 已退出（代码 ', log_err: '启动错误：',
    footer: '由 GwebStudio 开发'
  }
};

let lang = 'en';
try {
  const saved = localStorage.getItem('lang');
  const nav = (navigator.language || 'en').toLowerCase();
  lang = saved && I18N[saved] ? saved : nav.startsWith('zh') ? 'zh' : nav.startsWith('ru') ? 'ru' : 'en';
} catch {}

const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
const errText = (r) => (t('err_' + r.code) || r.code) + (r.detail || '');

let running = false;
let usbMode = false;
let lastUsbMsg = null; // функция, возвращающая текст на текущем языке

function applyLang() {
  document.documentElement.lang = lang;
  $('lang').value = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  $('statusText').textContent = running ? t('status_waiting') : t('status_stopped');
  $('toggle').textContent = running ? t('stop') : t('start');
  if (lastUsbMsg) $('usbLog').textContent = lastUsbMsg();
  if (usbMode) refreshUsb();
}

$('lang').addEventListener('change', () => {
  lang = $('lang').value;
  try { localStorage.setItem('lang', lang); } catch {}
  applyLang();
});

// ---------- AirPlay ----------
function setState(s) {
  running = s.running;
  $('status').classList.toggle('on', running);
  $('statusText').textContent = running ? t('status_waiting') : t('status_stopped');
  $('toggle').textContent = running ? t('stop') : t('start');
  $('toggle').classList.toggle('stop', running);
  ['name', 'fps', 'fullscreen', 'noAudio', 'pin'].forEach((id) => ($(id).disabled = running));
}

function log(t) {
  const el = $('log');
  el.textContent += t;
  el.scrollTop = el.scrollHeight;
}

$('toggle').addEventListener('click', async () => {
  if (running) {
    await window.mirror.stop();
    return;
  }
  const res = await window.mirror.start({
    name: $('name').value,
    fps: Number($('fps').value),
    fullscreen: $('fullscreen').checked,
    noAudio: $('noAudio').checked,
    pin: $('pin').checked
  });
  if (!res.ok) log(errText(res) + '\n');
});

window.mirror.onLog(log);
window.mirror.onState(setState);

// ---------- вкладки ----------
function showTab(usb) {
  usbMode = usb;
  $('airView').classList.toggle('hidden', usb);
  $('usbView').classList.toggle('hidden', !usb);
  $('tabAir').classList.toggle('active', !usb);
  $('tabUsb').classList.toggle('active', usb);
  if (usb) refreshUsb();
}
$('tabAir').addEventListener('click', () => showTab(false));
$('tabUsb').addEventListener('click', () => showTab(true));

// ---------- USB ----------
function usbMsg(fn) {
  lastUsbMsg = typeof fn === 'function' ? fn : () => fn;
  $('usbLog').textContent = lastUsbMsg();
}

async function refreshUsb() {
  usbMsg(() => t('usb_searching'));
  const res = await window.mirror.usbList();
  const box = $('devices');
  box.textContent = '';
  if (!res.ok) { usbMsg(() => errText(res)); return; }
  if (!res.devices.length) { usbMsg(() => t('usb_none')); return; }
  usbMsg('');
  res.devices.forEach((d) => {
    const row = document.createElement('div');
    row.className = 'dev';
    const info = document.createElement('div');
    info.textContent = t('usb_dev') + ' (PID 0x' + d.pid.toString(16) + ')';
    const sm = document.createElement('small');
    sm.textContent = d.openError ? t('usb_noaccess') : t('usb_serial') + (d.serial || t('usb_unknown'));
    info.appendChild(sm);
    row.appendChild(info);
    if (d.qtReady) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = t('usb_ready');
      row.appendChild(b);
    } else {
      const btn = document.createElement('button');
      btn.textContent = t('usb_enable');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        usbMsg(() => t('usb_enabling'));
        const r = await window.mirror.usbEnable(d);
        usbMsg(() => (r.ok ? (r.ready ? t('usb_done') : t('usb_notready')) : errText(r)));
        refreshUsb();
      });
      row.appendChild(btn);
    }
    box.appendChild(row);
  });
}
$('usbRefresh').addEventListener('click', refreshUsb);

$('usbDriver').addEventListener('click', async () => {
  const res = await window.mirror.usbDriver();
  $('driverHelp').classList.remove('hidden');
  usbMsg(() => (res.ok ? t('zadig_started') : errText(res)));
});

// ---------- обновления ----------
function showUpd(textFn, actions) {
  $('updBar').classList.remove('hidden');
  $('updText').textContent = textFn();
  $('updActions').textContent = '';
  (actions || []).forEach((a) => $('updActions').appendChild(a));
}

function actionBtn(label, fn, ghost) {
  const b = document.createElement('button');
  b.textContent = label;
  if (ghost) b.className = 'ghost';
  b.style.marginLeft = '8px';
  b.addEventListener('click', fn);
  return b;
}

$('updBtn').addEventListener('click', async () => {
  $('updBtn').disabled = true;
  showUpd(() => t('upd_checking'));
  const r = await window.mirror.checkUpdate();
  $('updBtn').disabled = false;
  if (!r.ok) { showUpd(() => errText(r)); return; }
  if (!r.available) { showUpd(() => t('upd_latest') + r.current); return; }
  const acts = [];
  if (r.canInstall) {
    acts.push(actionBtn(t('upd_install'), async (e) => {
      e.target.disabled = true;
      showUpd(() => t('upd_downloading'));
      const x = await window.mirror.installUpdate();
      if (!x.ok) showUpd(() => errText(x));
    }));
  }
  acts.push(actionBtn(t('upd_page'), () => window.mirror.openExternal(r.page), true));
  showUpd(() => t('upd_available') + r.latest + t('upd_current') + r.current + (lang === 'zh' ? '）' : ')'), acts);
});

// ---------- старт ----------
window.mirror.version().then((v) => ($('ver').textContent = 'v' + v));
applyLang();
