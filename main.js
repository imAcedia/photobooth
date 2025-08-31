'use strict'

const { join } = require('node:path');
const { app, BrowserWindow, ipcMain, clipboard, globalShortcut } = require('electron');
const { Snap } = require('midtrans-client');
const http = require('http');
const { parse } = require('url');
const { nanoid } = require('nanoid');

//
const { procRunning } = require('./src/proc-running.js');
const { PhotoboothSettings } = require('./src/settings.js');

//
let settings = new PhotoboothSettings();
let mainWindow;

//
app.whenReady().then(async () => {
    // 
    const isSettingsLoaded = await settings.loadSettings();
    if (!isSettingsLoaded) {
        console.log('Failed to load settings...');
        app.quit();
        return;
    }

    // Register IPCs
    ipcMain.handle('requestTransaction', () => requestTransaction());
    ipcMain.handle('startDslrBooth', () => startDslrBooth());
    ipcMain.handle('getIsSandbox', () => settings.getBool('sandbox'));
    ipcMain.handle('copyQr', (e, qrUrl) => clipboard.writeText(qrUrl));

    // Register keyboard
    globalShortcut.register('F12', () => {
        console.log('global shortcuts!');
    });

    //
    createWindow();

    // Listen for dslrBooth triggers
    http.createServer(onDslrBoothTrigger).listen(settings.getInt('dslrBooth_triggerPort'));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        resizable: false,
        alwaysOnTop: false,
        fullscreen: true,

        webPreferences: {
            preload: join(__dirname, 'src/preload.js')
        }
    });

    mainWindow.maximize();
    mainWindow.loadFile('index.html');

    if (settings.getBool('showDevTools')) {
        mainWindow.webContents.openDevTools();
    }
}

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

async function requestTransaction() {
    if (!settings.getBool('ignoreDslrBooth')){
        const isReady = await isDslrBoothReady();
        if (isReady !== true) {
            throw `DslrBooth is not ready: ${isReady}`;
        }
    }

    console.log('Request Transaction');
    const isSandbox = settings.getBool('sandbox');
    let snap = new Snap({
        isProduction: !isSandbox,
        serverKey: isSandbox ? 'SB-Mid-server-HjHxxzsS4aqMylbemx5OCgyw' : 'Mid-server-ZCGoFe8Svl34PGBFdYBGxZSf',
        clientKey: isSandbox ? 'SB-Mid-client-L3k5j5hR-bd20Lte' : 'Mid-client-HGiCGGgxB-7NFqqK',
    });

    let parameter = {
        'transaction_details': {
            'order_id': nextOrderId(),
            'gross_amount': settings.getInt('price'),
        },

        // "expiry": {
        //     "unit": "minutes",
        //     "duration": 1
        // },

        'credit_card': {
            'secure': true,
        },
    };

    return snap.createTransaction(parameter);
}

function nextOrderId() {
    let order = `${settings.getString('idPrefix')}${nanoid()}`;
    return order;
}

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

async function isDslrBoothReady() {
    const isDslrBoothRunning = await procRunning('dslrBooth.exe');
    if (!isDslrBoothRunning) {
        return 'Process not running';
    }

    // Check if the lockscreen is ready
    if (settings.getBool('checkLockscreen'))
    {
        const apiPass = settings.getString('dslrBooth_pass');
        const apiPort = settings.getInt('dslrBooth_apiPort');

        const lockscreenReady = await

            // First, try sending the show lockscreen api to dslrbooth
            new Promise(
                (resolve, reject) => {
                    const apiUrl = `http://localhost:${apiPort}/api/lockscreen/show?password=${apiPass}`;
                    http.get(apiUrl,
                        (res) => {
                            let rawData = '';

                            res.on('data', (chunk) => {
                                rawData += chunk;
                            });

                            res.on('end', () => {
                                try {
                                    const data = JSON.parse(rawData);
                                    const isSuccessful = data['IsSuccessful'];
                                    if (!isSuccessful) {
                                        throw data['ErrorMessage'];
                                    }

                                    resolve();
                                } catch (e) {
                                    reject();
                                }
                            });
                        })
                        .on('error', (e) => {
                            reject();
                        });
                })

                // Then if it's successful, try sending the hide lockscreen api
                .then(() => new Promise((resolve, reject) => {
                    const apiUrl = `http://localhost:${apiPort}/api/lockscreen/exit?password=${apiPass}`;
                    http.get(apiUrl,
                        (res) => {
                            let rawData = '';

                            res.on('data', (chunk) => {
                                rawData += chunk;
                            });

                            res.on('end', () => {
                                try {
                                    const data = JSON.parse(rawData);
                                    const isSuccessful = data['IsSuccessful'];
                                    if (!isSuccessful) {
                                        throw data['ErrorMessage'];
                                    }

                                    resolve();
                                } catch (e) {
                                    reject();
                                }
                            });
                        })
                        .on('error', (e) => {
                            reject();
                        });
                }))

                // If all of them successful, then the lockscreen is ready
                .then(() => true)
                // Else if any one of them fails, then the lockscreen is not ready yet
                .catch((e) => e);

        if (!lockscreenReady) {
            return e;
        }
    }

    return true;
}

function startDslrBooth() {
    return new Promise((resolve, reject) => {
        const apiPass = settings.getString('dslrBooth_pass');
        const apiPort = settings.getString('dslrBooth_apiPort');
        const apiUrl = `http://localhost:${apiPort}/api/start?mode=print&password=${apiPass}`;
        http.get(apiUrl,
            (res) => {
                let rawData = '';

                res.on('data', (chunk) => {
                    rawData += chunk;
                });

                res.on('end', () => {
                    try {
                        const data = JSON.parse(rawData);
                        const isSuccessful = data['IsSuccessful'];
                        console.log(`START DSLRBOOTH: ${isSuccessful}`);
                        if (!isSuccessful) {
                            throw data['ErrorMessage'];
                        }

                        mainWindow.hide();
                        resolve();
                    } catch (e) {
                        console.log(`Failed to start dslrBooth: ${e}`);
                        reject(`Failed to start dslrBooth: ${e}`);
                    }
                });
            })
            .on('error', (e) => {
                console.log(`Failed to start dslrBooth: ${e}`);
                reject(`Failed to start dslrBooth: ${e}`);
            });
    });
}

function onDslrBoothTrigger(req, res) {
    const eventType = parse(req.url, true).query['event_type'];
    if (eventType == 'session_end') {
        mainWindow.show();
    }
}

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
