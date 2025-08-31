const { exec } = require('child_process');

/**
 * Find running process(es) by name
 * @param {string} query Name of the process to find (e.g., "Notepad.exe")
 */
const procRunning = (query) => {
    return new Promise((resolve) => {
        let platform = process.platform;
        let cmd = '';
        switch (platform) {
            case 'win32':
                cmd = `tasklist`;
                break;
            case 'darwin':
                cmd = `pgrep -l ${query} | awk '{ print $2 }'`;
                break;
            case 'linux':
                cmd = `pgrep -l ${query} | awk '{ print $2 }'`;
                break;
    
            default: 
                resolve(false);
                break;
        }
    
        exec(cmd, (err, stdout) => {
            const isProcessRunning = stdout.toLowerCase().indexOf(query.toLowerCase()) > -1;
            resolve(isProcessRunning);
        });
    });
}

module.exports = { procRunning };
