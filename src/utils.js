const os = require('os');
const { readdir } = require('fs').promises;
const path = require('path');
const translations = require('./translations');

/**
 * Detects the preferred language from the request header.
 * @param {import('express').Request} req - The Express request object.
 * @returns {('en'|'zh')} The determined language key.
 */
function getLang(req) {
    const langHeader = req.headers['accept-language'] || 'en';
    return langHeader.includes('zh') ? 'zh' : 'en';
}

/**
 * Gets all non-internal IPv4 addresses of the host machine.
 * @returns {string[]} An array of local IP addresses.
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
 * Recursively gets all file paths within a user's directory.
 * @param {string} userUploadDir - The full path to the user's upload directory.
 * @param {string} [baseDir=''] - The base directory for relative paths.
 * @returns {Promise<string[]>} A promise that resolves to an array of relative file paths.
 */
async function getAllFiles(userUploadDir, baseDir = '') {
    let files = [];
    try {
        // Ensure we are reading from the specific user's directory
        const entries = await readdir(userUploadDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(userUploadDir, entry.name);
            const relPath = path.join(baseDir, entry.name).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                // Pass the new fullPath and relPath to the recursive call
                files = files.concat(await getAllFiles(fullPath, relPath));
            } else {
                files.push(relPath);
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            // ENOENT is fine (directory doesn't exist yet), but log other errors
            console.error(`Error reading directory ${userUploadDir}:`, err);
        }
    }
    return files;
}

/**
 * Generates a new v4 UUID.
 * @returns {Promise<string>} A promise that resolves to a new UUID.
 */
async function generateUuid() {
    // Dynamically import the ESM 'uuid' package
    const { v4: uuidv4 } = await import('uuid');
    return uuidv4();
}
/**
 * Gets the system language for console logs.
 * @returns {('en'|'zh')} The determined language key.
 */
function getSystemLang() {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    return systemLocale.startsWith('zh') ? 'zh' : 'en';
}

/**
 * Gets the translation object for a given language key.
 * @param {('en'|'zh')} langKey - The language key.
 * @returns {object} The translation strings.
 */
function getTranslations(langKey) {
    return translations[langKey] || translations['en'];
}
// A regex for v4 UUIDs
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a v4 UUID.
 * @param {string} uuid - The string to validate.
 * @returns {boolean} True if valid v4 UUID, false otherwise.
 */
function isValidUuid(uuid) {
    if (typeof uuid !== 'string') {
        return false;
    }
    return UUID_V4_REGEX.test(uuid);
}

module.exports = {
    getLang,
    getLocalIPs,
    getAllFiles,
    generateUuid,
    getSystemLang,
    getTranslations,
    isValidUuid
};