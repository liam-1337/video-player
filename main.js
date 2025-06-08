const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let serverProcess
let mainWindow // Declare mainWindow in a broader scope

function createWindow () {
  mainWindow = new BrowserWindow({ // Assign to the broader scope variable
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(path.join(__dirname, 'client', 'build', 'index.html')) // Corrected path
  }
}

// Define the menu template
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
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: async () => {
          const { dialog } = require('electron') // Local require for dialog
          dialog.showMessageBox(null, {
            type: 'info',
            title: 'About MediaHub',
            message: 'MediaHub Electron App',
            detail: 'Version 1.0.0' // Replace with actual app version if available
          })
        }
      }
    ]
  }
];

app.whenReady().then(() => {
  // Set the application menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // IPC handler for opening directory dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    if (!mainWindow) {
      console.error('Main window not available for dialog');
      return null;
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  // Start the Node.js server
  serverProcess = spawn('node', ['server/index.js'], { cwd: path.join(__dirname) })

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  // Kill the server process before quitting
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})
