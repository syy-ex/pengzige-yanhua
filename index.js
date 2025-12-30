const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const path = require('path');

let windows = [];

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createOverlayWindows() {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;

  windows = displays.map((d) => {
    const win = new BrowserWindow({
      x: d.bounds.x,
      y: d.bounds.y,
      width: d.bounds.width,
      height: d.bounds.height,

      transparent: true,
      backgroundColor: '#00000000',

      frame: false,
      resizable: false,
      movable: false,
      hasShadow: false,
      fullscreenable: false,

      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false, // 不抢焦点，避免影响你正常操作
      show: false,

      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    if (d.id !== primaryId) {
      win.webContents.setAudioMuted(true);
    }

    // 鼠标穿透（关键）
    win.setIgnoreMouseEvents(true, { forward: true });

    // 置顶级别：尽量高（Windows/macOS/Linux 通常都可）
    win.setAlwaysOnTop(true, 'screen-saver');

    // macOS：切换桌面/全屏空间时也保持可见
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    win.loadFile(path.join(__dirname, 'index.html'));

    win.once('ready-to-show', () => {
      // showInactive：显示但不抢焦点
      win.showInactive();
    });

    return win;
  });
}

function toggleShowHide() {
  const anyVisible = windows.some(w => w.isVisible());
  windows.forEach(w => {
    if (anyVisible) w.hide();
    else w.showInactive();
  });
}

app.whenReady().then(() => {
  // 某些机器透明窗口可能出现性能/渲染问题时，可尝试打开下一行：
  // app.disableHardwareAcceleration();

  createOverlayWindows();

  // 全局快捷键（不需要窗口焦点）
  globalShortcut.register('CommandOrControl+Alt+F11', toggleShowHide);
  globalShortcut.register('CommandOrControl+Alt+F12', () => app.quit());

  // 显示器配置变化时重建窗口（拔插显示器/分辨率变化）
  screen.on('display-added', () => { windows.forEach(w => w.destroy()); createOverlayWindows(); });
  screen.on('display-removed', () => { windows.forEach(w => w.destroy()); createOverlayWindows(); });
  screen.on('display-metrics-changed', () => { windows.forEach(w => w.destroy()); createOverlayWindows(); });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 不让应用在窗口关闭时自动退出（因为我们主要靠快捷键控制）
app.on('window-all-closed', (e) => {
  e.preventDefault();
});
