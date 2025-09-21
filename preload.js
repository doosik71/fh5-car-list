const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getCars: (args) => ipcRenderer.invoke('get-cars', args),
  addCar: (carData) => ipcRenderer.invoke('add-car', carData),
  updateCar: (carData) => ipcRenderer.invoke('update-car', carData)
});
