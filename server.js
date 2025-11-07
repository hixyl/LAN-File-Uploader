const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { readdir } = require('fs').promises;

// --- Constants ---
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// --- Internationalization (i18n) Strings ---
const translations = {
    en: {
        title: 'LAN File Uploader',
        header: '🚀 LAN File Uploader',
        filesUploadLabel: 'Select file(s) to upload:',
        folderUploadLabel: 'Select folder to upload:',
        uploadButton: 'Upload',
        fileListHeader: 'Uploaded Files',
        noFiles: 'No files uploaded yet.',
        loadError: 'Could not load file list.',
        fileNotSelected: 'No file selected.',
        serverStarted: '🚀 Server started!',
        listeningOn: `Listening on port ${PORT}`,
        accessInstructions: 'Access the server at:',
        localhost: 'Local:',
        lan: 'LAN:',
        noLan: '(No LAN IP found. Please check your network.)'
    },
    zh: {
        title: '局域网文件上传',
        header: '🚀 局域网文件上传',
        filesUploadLabel: '选择文件（可多选）：',
        folderUploadLabel: '选择文件夹上传：',
        uploadButton: '上传',
        fileListHeader: '已上传文件',
        noFiles: '还没有上传文件',
        loadError: '无法加载文件列表',
        fileNotSelected: '没有选择文件',
        serverStarted: '🚀 服务器已启动！',
        listeningOn: `正在监听 ${PORT} 端口`,
        accessInstructions: '请在浏览器中访问以下地址:',
        localhost: '本机:',
        lan: '局域网:',
        noLan: '(未找到局域网IP, 请手动查询本机IP)'
    }
};

// --- Utility Functions ---

/**
 * Detects the preferred language from the request header.
 * Defaults to 'en' if 'zh' is not found.
 * @param {express.Request} req - The Express request object.
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
 * Recursively gets all file paths within a directory.
 * @param {string} dirPath - The directory to scan.
 * @param {string} [baseDir=''] - The base directory for relative paths.
 * @returns {Promise<string[]>} A promise that resolves to an array of relative file paths.
 */
async function getAllFiles(dirPath, baseDir = '') {
    let files = [];
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            // Use path.join and then normalize to forward slashes for cross-platform URL compatibility
            const relPath = path.join(baseDir, entry.name).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                files = files.concat(await getAllFiles(fullPath, relPath));
            } else {
                files.push(relPath);
            }
        }
    } catch (err) {
        // If the base UPLOAD_DIR doesn't exist on first run, readdir will fail.
        // This is fine, just return an empty array.
        if (err.code !== 'ENOENT') {
            console.error(`Error reading directory ${dirPath}:`, err);
        }
    }
    return files;
}


// --- Application Setup ---
const app = express();

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- Multer Configuration ---
const storage = multer.diskStorage({
    /**
     * Determines the destination directory.
     * This logic creates subdirectories to match the client's folder structure.
     */
    destination: (req, file, cb) => {
        // 1. Fix garbled filenames (e.g., Chinese)
        const buffer = Buffer.from(file.originalname, 'latin1');
        const decodedName = buffer.toString('utf-8');

        // 2. Get the relative directory path from the file's original name
        // e.g., "folder/subfolder/image.png" -> "folder/subfolder"
        // e.g., "image.png" -> "."
        const relDir = path.dirname(decodedName);

        // 3. Create the full destination path
        const destPath = path.join(UPLOAD_DIR, relDir);

        // 4. Store the decoded info for the 'filename' function to use
        // We attach it to the 'file' object which is passed along.
        file.decodedName = decodedName;
        file.relDir = relDir;

        // 5. Ensure the directory exists
        fs.mkdir(destPath, { recursive: true }, (err) => {
            if (err) {
                cb(err, destPath);
            } else {
                cb(null, destPath);
            }
        });
    },
    /**
     * Determines the file's name.
     * Handles name collisions by appending a timestamp.
     */
    filename: (req, file, cb) => {
        // Retrieve the decoded name and relative dir set in 'destination'
        const decodedName = file.decodedName;
        const relDir = file.relDir;

        // Get the simple basename, e.g., "image.png"
        const basename = path.basename(decodedName);

        // Check if file already exists *in its target directory*
        const fullPath = path.join(UPLOAD_DIR, relDir, basename);

        if (fs.existsSync(fullPath)) {
            // If exists, append a timestamp
            const ext = path.extname(basename);
            const base = path.basename(basename, ext);
            // Format: [filename]-[timestamp].[ext]
            const newName = `${base}-${Date.now()}${ext}`;
            cb(null, newName);
        } else {
            // If not, use the original basename
            cb(null, basename);
        }
    }
});

const upload = multer({ storage: storage });

// --- Middleware ---
// Serve uploaded files statically from the '/files' route
app.use('/files', express.static(UPLOAD_DIR));

// --- Routes ---

/**
 * Root route (GET /)
 * Displays the upload forms and the (recursive) list of uploaded files.
 */
app.get('/', async (req, res) => {
    const langKey = getLang(req);
    const t = translations[langKey];

    let fileListHtml = '';
    try {
        // Recursively get all files
        const files = await getAllFiles(UPLOAD_DIR);

        if (files.length === 0) {
            fileListHtml = `<li>${t.noFiles}</li>`;
        } else {
            fileListHtml = files
                .sort() // Sort alphabetically
                .map(file => {
                    // 'file' is already a relative path like 'folder/image.png'
                    // We must encode each part of the path separately for the URL.
                    const fileUrl = `/files/${file.split('/').map(encodeURIComponent).join('/')}`;
                    return `<li><a href="${fileUrl}" target="_blank">${file}</a></li>`;
                }).join('');
        }
    } catch (err) {
        console.error("Could not read 'uploads' directory:", err);
        fileListHtml = `<li>${t.loadError}</li>`;
    }

    // Send the full HTML page
    res.send(`
    <!DOCTYPE html>
    <html lang="${langKey}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 20px auto; padding: 0 15px; background: #fdfdfd; color: #333; }
            h1, h2 { color: #111; }
            form { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; }
            input[type="file"] { display: block; margin-bottom: 12px; }
            button { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0056b3; }
            ul { list-style: none; padding-left: 0; }
            li { background: #eee; padding: 10px 12px; margin-bottom: 5px; border-radius: 4px; font-family: "Menlo", "Consolas", monospace; }
            li a { text-decoration: none; color: #0056b3; font-weight: 500; }
            li a:hover { text-decoration: underline; }
            .form-separator { height: 1px; background: #ddd; margin: 30px 0; }
        </style>
    </head>
    <body>
        <h1>${t.header}</h1>
        
        <form action="/upload" method="POST" enctype="multipart/form-data">
            <label for="fileInput">${t.filesUploadLabel}</label>
            <input type="file" id="fileInput" name="uploadedFiles" multiple>
            <button type="submit">${t.uploadButton}</button>
        </form>

        <div class="form-separator"></div>

        <form action="/upload" method="POST" enctype="multipart/form-data">
            <label for="folderInput">${t.folderUploadLabel}</label>
            <input type="file" id="folderInput" name="uploadedFiles" webkitdirectory directory multiple>
            <button type="submit">${t.uploadButton}</button>
        </form>

        <h2>${t.fileListHeader}</h2>
        <ul>
            ${fileListHtml}
        </ul>
    </body>
    </html>
    `);
});

/**
 * Upload route (POST /upload)
 * Handles both multi-file and folder uploads.
 */
app.post('/upload', (req, res, next) => {
    const langKey = getLang(req);
    const t = translations[langKey];

    // Use upload.array() to handle multiple files from both forms.
    // '100' is an arbitrary limit on the number of files per batch.
    const uploader = upload.array('uploadedFiles', 100);

    uploader(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).send(`Multer Error: ${err.message}`);
        } else if (err) {
            return res.status(500).send(`Unknown Error: ${err.message}`);
        }

        // Check if req.files exists and has files
        if (!req.files || req.files.length === 0) {
            return res.status(400).send(t.fileNotSelected);
        }

        // Files uploaded successfully, redirect to home
        res.redirect('/');
    });
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => {
    // Detect system language for console logs
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    const consoleLangKey = systemLocale.startsWith('zh') ? 'zh' : 'en';
    const t = translations[consoleLangKey];

    const ips = getLocalIPs();

    console.log(`${t.serverStarted} (${t.listeningOn})`);
    console.log(t.accessInstructions);
    
    // Log localhost access URL
    console.log(`    - ${t.localhost} http://localhost:${PORT}`);
    
    // Log all available LAN IP addresses
    if (ips.length > 0) {
        ips.forEach(ip => {
            console.log(`    - ${t.lan} http://${ip}:${PORT}`);
        });
    } else {
        console.log(`    - (${t.noLan})`);
    }
});