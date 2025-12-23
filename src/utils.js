const os = require('os');
const { readdir } = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const translations = require('./translations');

/**
 * Detects the preferred language from the request header.
 */
function getLang(req) {
    const langHeader = req.headers['accept-language'] || 'en';
    return langHeader.includes('zh') ? 'zh' : 'en';
}

/**
 * Gets local IPv4 addresses.
 */
function getLocalIPs() {
    const networkInterfaces = os.networkInterfaces();
    const ips = [];

    Object.keys(networkInterfaces).forEach(interfaceName => {
        const interfaces = networkInterfaces[interfaceName];
        if (interfaces) {
            for (const iface of interfaces) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    ips.push(iface.address);
                }
            }
        }
    });
    return ips;
}

/**
 * Recursively gets file paths.
 */
async function getAllFiles(userUploadDir, baseDir = '') {
    let files = [];
    try {
        const entries = await readdir(userUploadDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(userUploadDir, entry.name);
            const relPath = path.join(baseDir, entry.name).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                files = files.concat(await getAllFiles(fullPath, relPath));
            } else {
                files.push(relPath);
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Error reading directory ${userUploadDir}:`, err);
        }
    }
    return files;
}

/**
 * Generates a deterministic UUID based on username and password.
 * This allows us to map a user/pass combo to the same folder without a database.
 */
function generateUserUuid(username, password) {
    const hash = crypto.createHash('sha256')
        .update(`${username.toLowerCase()}:${password}`)
        .digest('hex');

    // Format hex string into a UUID-like structure (8-4-4-4-12)
    // We use version 4 (random) and variant 1 (RFC4122) bits for compatibility
    const uuid = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16), // Version 4
        ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20), // Variant 1
        hash.substring(20, 32)
    ].join('-');

    return uuid;
}

function getSystemLang() {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    return systemLocale.startsWith('zh') ? 'zh' : 'en';
}

function getTranslations(langKey) {
    return translations[langKey] || translations['en'];
}

/**
 * Simple validation for credentials.
 */
function validateCredentials(username, password) {
    const userRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return userRegex.test(username) && password && password.length >= 6;
}

module.exports = {
    getLang,
    getLocalIPs,
    getAllFiles,
    generateUserUuid,
    getSystemLang,
    getTranslations,
    validateCredentials
};