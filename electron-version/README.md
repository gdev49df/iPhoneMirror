# Apple Mirror

Windows-приложение: показывает экран iPhone/iPad на компьютере через AirPlay.
Оболочка на Electron, приём потока делает [UxPlay](https://github.com/FDH2/UxPlay) (GPL-3.0).

## Как пользоваться
1. ПК и iPhone в одной Wi-Fi сети.
2. Запустить Apple Mirror → «Запустить».
3. iPhone: Пункт управления → Повтор экрана → «Apple Mirror».

На Windows для обнаружения устройств нужен сервис Bonjour (ставится вместе с iTunes / Apple Devices).

## Сборка
- Автоматически: пуш в `main` запускает GitHub Actions, который собирает UxPlay и установщик. Готовый `.exe` лежит в артефактах `Apple-Mirror-Setup`.
- Вручную: положить `uxplay.exe` с DLL и папкой `gstreamer-1.0` в `resources/uxplay`, затем `npm install && npm run dist`.
- Запуск для разработки: `npm install && npm start`.

## USB-режим
Вкладка USB: «Включить захват» → «Показать экран». Видео принимается по протоколу QuickTime Screen Capture
(порт на JS по [quicktime_video_hack](https://github.com/danielpaulus/quicktime_video_hack), MIT) и декодируется через WebCodecs.

## Что пока не сделано
- Звук в USB-режиме (видео H.264 уже выводится в окне).
- Видео сейчас выводится окном UxPlay (GStreamer), а не внутри окна Electron.
- Запись, скриншоты, трансляция в OBS.

Разработано GwebStudio
