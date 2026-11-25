const $ = (id) => document.getElementById(id);
let running = false;

function setState(s) {
  running = s.running;
  $('status').classList.toggle('on', running);
  $('statusText').textContent = running ? 'Ожидает подключения' : 'Остановлено';
  $('toggle').textContent = running ? 'Остановить' : 'Запустить';
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
  if (!res.ok) log(res.error + '\n');
});

window.mirror.onLog(log);
window.mirror.onState(setState);

// ---- вкладки ----
function showTab(usb) {
  $('airView').classList.toggle('hidden', usb);
  $('usbView').classList.toggle('hidden', !usb);
  $('tabAir').classList.toggle('active', !usb);
  $('tabUsb').classList.toggle('active', usb);
  if (usb) refreshUsb();
}
$('tabAir').addEventListener('click', () => showTab(false));
$('tabUsb').addEventListener('click', () => showTab(true));

// ---- USB ----
function usbMsg(t) { $('usbLog').textContent = t; }

async function refreshUsb() {
  usbMsg('Ищу устройства…');
  const res = await window.mirror.usbList();
  const box = $('devices');
  box.textContent = '';
  if (!res.ok) { usbMsg('Ошибка: ' + res.error); return; }
  if (!res.devices.length) { usbMsg('iPhone/iPad не найден. Проверь кабель и разблокируй устройство.'); return; }
  usbMsg('');
  res.devices.forEach((d) => {
    const row = document.createElement('div');
    row.className = 'dev';
    const info = document.createElement('div');
    info.textContent = 'Apple устройство (PID 0x' + d.pid.toString(16) + ')';
    const sm = document.createElement('small');
    sm.textContent = d.openError ? 'Нет доступа по USB: нужен драйвер' : 'Серийный номер: ' + (d.serial || 'неизвестен');
    info.appendChild(sm);
    row.appendChild(info);
    if (d.qtReady) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'Режим захвата включён';
      row.appendChild(b);
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Включить захват';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        usbMsg('Включаю режим захвата…');
        const r = await window.mirror.usbEnable(d);
        usbMsg(r.ok ? (r.ready ? 'Готово: устройство в режиме захвата.' : 'Запрос принят, но режим не появился. Переподключи кабель и повтори.') : r.error);
        refreshUsb();
      });
      row.appendChild(btn);
    }
    box.appendChild(row);
  });
}
$('usbRefresh').addEventListener('click', refreshUsb);
