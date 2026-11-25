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
