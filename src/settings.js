'use strict'

const fs = require('fs');
const readline = require('readline');

class PhotoboothSettings {
    constructor() {
        this.settingsPath = 'settings.conf';
    }

    async loadSettings() {
        const fileExist = fs.existsSync(this.settingsPath);
        if (!fileExist) {
            return false;
        }

        const fileStream = fs.createReadStream(this.settingsPath);
        const lineReader = readline.createInterface({
            input: fileStream,
            // Note: we use the crlfDelay option to recognize all instances of CR LF
            // ('\r\n') in input.txt as a single line break.
            crlfDelay: Infinity
        });

        for await (let rawLine of lineReader) {
            const line = rawLine.trim();
            const isEmptyLine = !line || line.length === 0;
            if (isEmptyLine) {
                continue;
            }

            const isComment = line.startsWith('#');
            if (isComment) {
                continue;
            }

            const [key, ...rawValue] = line.split('=');
            const isExprInvalid = !key || !rawValue || rawValue.length === 0;
            if (isExprInvalid) {
                continue;
            }

            const value = rawValue.join('=');
            this[key] = value.trim();
        }

        return true;
    }

    getBool(key) {
        return this[key]?.toLowerCase?.() === 'true';
    }

    getInt(key) {
        const parsed = parseInt(this[key]);
        return isNaN(parsed) ? 0 : parsed;
    }

    getFloat(key) {
        const parsed = parseInt(this[key]);
        return isNaN(parsed) ? 0 : parsed;
    }

    getString(key) {
        const parsed = this[key];
        return parsed === undefined ? '' : parsed;
    }
}

module.exports = { PhotoboothSettings };
