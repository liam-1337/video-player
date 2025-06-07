const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectMediaDirectory: () => ipcRenderer.invoke('select-media-directory')
})

// Original preload content, can be kept if still needed for index.html
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    const el = document.getElementById(`${type}-version`)
    if (el) el.innerText = process.versions[type]
  }
})
