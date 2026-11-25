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

## Что пока не сделано
- USB-режим (как в iPhoneMirror) — нужен отдельный протокол Screen Capture через libusb.
- Видео сейчас выводится окном UxPlay (GStreamer), а не внутри окна Electron.
- Запись, скриншоты, трансляция в OBS.

Создано @bauyrzhanov_12_
