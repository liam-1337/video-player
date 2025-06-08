const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory')
})

// The rest of your preload script (if any) can remain.
// For example, the DOMContentLoaded listener:
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    if (process.versions[dependency]) { // Check if the version property exists
      replaceText(`${dependency}-version`, process.versions[dependency])
    }
  }
})
