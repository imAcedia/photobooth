'use strict'

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('requestTransaction', () => ipcRenderer.invoke('requestTransaction'));
contextBridge.exposeInMainWorld('startDslrBooth', () => ipcRenderer.invoke('startDslrBooth'));
contextBridge.exposeInMainWorld('getIsSandbox', () => ipcRenderer.invoke('getIsSandbox'));
contextBridge.exposeInMainWorld('copyQr', (qrUrl) => ipcRenderer.invoke('copyQr', qrUrl));

