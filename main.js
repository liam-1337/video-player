const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const { fork } = require('child_process')
const path = require('path')

let serverProcess
let mainWindow

function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    width: 300,
    height: 200,
    title: 'About Media Server Deluxe',
    modal: true,
    parent: mainWindow, // Make sure mainWindow is defined and available
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  aboutWindow.setMenuBarVisibility(false); // No menu for the about window
  aboutWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head><title>About</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2>Media Server Deluxe</h2>
        <p>Version ${app.getVersion()}</p>
        <p>An Electron, React, and Node.js application.</p>
      </body>
    </html>`);
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js') // Corrected path for preload
    }
  })

  // Load the index.html from the React app's build directory
  mainWindow.loadFile(path.join(__dirname, 'client/build/index.html'))
}

// Menu Template
const menuTemplate = [
  {
    label: 'File',
    submenu: [
      { role: 'quit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: createAboutWindow
      }
    ]
  }
];

app.whenReady().then(() => {
  // Set up application menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Pass the userData path to the server process via environment variable
  const userDataPath = app.getPath('userData')
  serverProcess = fork(path.join(__dirname, 'server', 'index.js'), [], {
    env: { ...process.env, MEDIA_LIBRARY_PATH: path.join(userDataPath, 'MediaLibrary'), DB_PATH: path.join(userDataPath, 'database.sqlite') }
  })

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`)
  })

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`)
  })

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// IPC handler for directory selection
ipcMain.handle('select-media-directory', async () => {
  if (!mainWindow) {
    console.error('Main window not available for dialog.');
    return null;
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled) {
    return null
  } else {
    return result.filePaths[0]
  }
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (serverProcess) {
    console.log('Killing server process')
    serverProcess.kill()
  }
})
