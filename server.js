const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// --- Constants ---
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// --- Internationalization (i18n) Strings ---
const translations = {
    en: {
        title: 'LAN File Uploader',
        header: '🚀 LAN File Uploader',
        uploadLabel: 'Select file to upload:',
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
        uploadLabel: '选择要上传的文件：',
        uploadButton: '上传',
        fileListHeader: '已上传文件',
        noFiles: '还没有上传文件',
        loadError: '无法加载文件列表',
        fileNotSelected: '没有选择文件',
        serverStarted: '🚀 服务器已启动！', // Note: Console logs will default to English
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

    // Iterate over all network interface names (e.g., 'Ethernet', 'Wi-Fi')
    Object.keys(networkInterfaces).forEach(interfaceName => {
        const interfaces = networkInterfaces[interfaceName];
        if (interfaces) {
            // Iterate over all addresses for this interface
            for (const iface of interfaces) {
                // Filter criteria:
                // 1. Must be IPv4
                // 2. Must not be internal (e.g., 127.0.0.1)
                if (iface.family === 'IPv4' && !iface.internal) {
                    ips.push(iface.address);
                }
            }
        }
    });
    return ips;
}

// --- Application Setup ---
const app = express();

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- Multer Configuration ---
const storage = multer.diskStorage({
    // Destination directory
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    // File naming logic
    filename: (req, file, cb) => {
        // 1. Fix garbled Chinese filenames (Multer's default is 'latin1')
        const buffer = Buffer.from(file.originalname, 'latin1');
        const decodedName = buffer.toString('utf-8');

        // 2. Check if the file already exists
        const fullPath = path.join(UPLOAD_DIR, decodedName);

        if (fs.existsSync(fullPath)) {
            // 3. If exists, append a timestamp
            const ext = path.extname(decodedName);
            const basename = path.basename(decodedName, ext);
            // Format: [filename]-[timestamp].[ext]
            const newName = `${basename}-${Date.now()}${ext}`;
            cb(null, newName);
        } else {
            // 4. If not, use the original decoded name
            cb(null, decodedName);
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
 * Displays the upload form and the list of uploaded files.
 * Language is determined by the 'Accept-Language' header.
 */
app.get('/', (req, res) => {
    const langKey = getLang(req);
    const t = translations[langKey];

    // Asynchronously read the contents of the upload directory
    fs.readdir(UPLOAD_DIR, (err, files) => {
        let fileListHtml = '';

        if (err) {
            console.error("Could not read 'uploads' directory:", err);
            fileListHtml = `<li>${t.loadError}</li>`;
        } else if (files.length === 0) {
            fileListHtml = `<li>${t.noFiles}</li>`;
        } else {
            fileListHtml = files.map(file => {
                // URL-encode filenames to handle special characters
                const fileUrl = `/files/${encodeURIComponent(file)}`;
                return `<li><a href="${fileUrl}" target="_blank">${file}</a></li>`;
            }).join('');
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
            form { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; }
            input[type="file"] { display: block; margin-bottom: 12px; }
            button { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0056b3; }
            ul { list-style: none; padding-left: 0; }
            li { background: #eee; padding: 10px 12px; margin-bottom: 5px; border-radius: 4px; }
            li a { text-decoration: none; color: #0056b3; font-weight: 500; }
            li a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>${t.header}</h1>
          <form action="/upload" method="POST" enctype="multipart/form-data">
            <label for="fileInput">${t.uploadLabel}</label>
            <input type="file" id="fileInput" name="uploadedFile" required>
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
});

/**
 * Upload route (POST /upload)
 * Handles the file upload process.
 */
app.post('/upload', (req, res, next) => {
    // Use a custom handler to detect language *before* multer runs
    const langKey = getLang(req);
    const t = translations[langKey];

    const uploader = upload.single('uploadedFile');

    uploader(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file too large)
            return res.status(400).send(`Multer Error: ${err.message}`);
        } else if (err) {
            // An unknown error occurred
            return res.status(500).send(`Unknown Error: ${err.message}`);
        }

        if (!req.file) {
            // No file was selected
            return res.status(400).send(t.fileNotSelected);
        }

        // File uploaded successfully, redirect to home
        res.redirect('/');
    });
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIPs();
    const t = translations.en; // Use English for console logs

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