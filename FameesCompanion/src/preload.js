const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companion', {
  on: (channel, fn) => {
    if (['show', 'reply', 'hide', 'routine', 'stats'].includes(channel)) ipcRenderer.on(channel, (_e, msg) => fn(msg));
  },
  action: id => ipcRenderer.send('action', id),
  setInteractive: on => ipcRenderer.send('interactive', on),
  ready: () => ipcRenderer.send('ready'),
  getStats: () => ipcRenderer.invoke('get-stats'),
});
