const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_BASE_DIR } = require('../config');
const { getAllFiles } = require('../utils');
const logger = require('../logger');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userUuid = req.session.userUuid;
        if (!userUuid) return cb(new Error('Auth required'), null);

        const buffer = Buffer.from(file.originalname, 'latin1');
        const decodedName = buffer.toString('utf-8');
        const relDir = path.dirname(decodedName);
        const destPath = path.join(UPLOAD_BASE_DIR, userUuid, relDir);

        file.decodedName = decodedName;
        file.relDir = relDir;

        fs.mkdir(destPath, { recursive: true }, (err) => cb(err, destPath));
    },
    filename: (req, file, cb) => {
        const userUuid = req.session.userUuid;
        const decodedName = file.decodedName;
        const fullPath = path.join(UPLOAD_BASE_DIR, userUuid, file.relDir, path.basename(decodedName));

        if (fs.existsSync(fullPath)) {
            const ext = path.extname(decodedName);
            const base = path.basename(decodedName, ext);
            cb(null, `${base}-${Date.now()}${ext}`);
        } else {
            cb(null, path.basename(decodedName));
        }
    }
});

const upload = multer({ storage, limits: { files: 100 } });

router.get('/', async (req, res) => {
    const { t, langKey, userUuid } = res.locals;
    const username = req.session.username || 'User';
    const userUploadDir = path.join(UPLOAD_BASE_DIR, userUuid);

    let fileListHtml = '';
    try {
        const files = await getAllFiles(userUploadDir);
        fileListHtml = files.length === 0 
            ? `<li>${t.noFiles}</li>` 
            : files.sort().map(file => {
                const fileUrl = `/files/${file.split('/').map(encodeURIComponent).join('/')}`;
                return `<li><a href="${fileUrl}" target="_blank">${file}</a></li>`;
            }).join('');
    } catch (err) {
        logger.error("Dir read error", { userUuid, error: err });
        fileListHtml = `<li>${t.loadError}</li>`;
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="${langKey}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
        <style>
            body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 20px auto; padding: 0 15px; background: #fdfdfd; color: #333; }
            header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 20px; }
            .user-tag { background: #e9ecef; padding: 5px 12px; border-radius: 20px; font-size: 0.9em; font-weight: 600; }
            form { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            button { background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
            button:disabled { background: #ccc; }
            #logoutBtn { background: #dc3545; }
            ul { list-style: none; padding: 0; }
            li { background: #f8f9fa; padding: 10px; margin-bottom: 6px; border-radius: 4px; border-left: 4px solid #007bff; }
            li a { text-decoration: none; color: #0056b3; font-family: monospace; }
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; }
            .modal-content { background: white; padding: 25px; border-radius: 8px; text-align: center; }
        </style>
    </head>
    <body>
        <header>
            <h1>${t.header}</h1>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="user-tag">${t.currentUser} ${username}</span>
                <button id="logoutBtn">${t.logoutModalCancel === 'Cancel' ? 'Logout' : '注销'}</button>
            </div>
        </header>
        
        <main>
            <form action="/upload" method="POST" enctype="multipart/form-data">
                <label>${t.filesUploadLabel}</label><br><br>
                <input type="file" name="uploadedFiles" multiple id="fi">
                <button type="submit" id="fb" disabled>${t.uploadButton}</button>
            </form>

            <form action="/upload" method="POST" enctype="multipart/form-data">
                <label>${t.folderUploadLabel}</label><br><br>
                <input type="file" name="uploadedFiles" webkitdirectory directory multiple id="gi">
                <button type="submit" id="gb" disabled>${t.uploadButton}</button>
            </form>

            <h2>${t.fileListHeader}</h2>
            <ul>${fileListHtml}</ul>
        </main>

        <div id="logoutModal" class="modal-overlay">
            <div class="modal-content">
                <h3>${t.logoutModalTitle}</h3>
                <p>${t.logoutConfirm}</p>
                <button id="confBtn" style="background:#dc3545">${t.logoutModalConfirm}</button>
                <button id="cancBtn" style="background:#6c757d">${t.logoutModalCancel}</button>
            </div>
        </div>

        <script>
            const setup = (i, b) => i.addEventListener('change', () => b.disabled = !i.files.length);
            setup(document.getElementById('fi'), document.getElementById('fb'));
            setup(document.getElementById('gi'), document.getElementById('gb'));

            const modal = document.getElementById('logoutModal');
            document.getElementById('logoutBtn').onclick = () => modal.style.display = 'flex';
            document.getElementById('cancBtn').onclick = () => modal.style.display = 'none';
            document.getElementById('confBtn').onclick = () => window.location.href = '/auth/logout';
        </script>
    </body>
    </html>
    `);
});

router.post('/upload', (req, res) => {
    const uploader = upload.array('uploadedFiles');
    uploader(req, res, (err) => {
        if (err) return res.status(500).send(`Error: ${err.message}`);
        res.redirect('/');
    });
});

module.exports = router;