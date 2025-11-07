const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_BASE_DIR } = require('../config');
const { getAllFiles } = require('../utils');
const logger = require('../logger');

const router = express.Router();

// --- Multer Configuration ---
const storage = multer.diskStorage({
    /**
     * Determines the destination directory based on user's session UUID.
     */
    destination: (req, file, cb) => {
        const userUuid = req.session.userUuid;
        // This should not happen if `checkAuth` middleware is used, but as a safeguard:
        if (!userUuid) {
            return cb(new Error('User not authenticated'), null);
        }

        const buffer = Buffer.from(file.originalname, 'latin1');
        const decodedName = buffer.toString('utf-8');
        const relDir = path.dirname(decodedName);
        
        // Files are stored under: uploads/<user-uuid>/<relative-path>/
        const destPath = path.join(UPLOAD_BASE_DIR, userUuid, relDir);

        file.decodedName = decodedName; // Pass info to 'filename'
        file.relDir = relDir;           // Pass info to 'filename'

        fs.mkdir(destPath, { recursive: true }, (err) => {
            cb(err, destPath);
        });
    },
    /**
     * Determines the file's name, handling collisions.
     */
    filename: (req, file, cb) => {
        const userUuid = req.session.userUuid;
        const decodedName = file.decodedName;
        const relDir = file.relDir;
        const basename = path.basename(decodedName);

        // Check for collision within the user's specific directory
        const fullPath = path.join(UPLOAD_BASE_DIR, userUuid, relDir, basename);

        if (fs.existsSync(fullPath)) {
            const ext = path.extname(basename);
            const base = path.basename(basename, ext);
            const newName = `${base}-${Date.now()}${ext}`;
            cb(null, newName);
        } else {
            cb(null, basename);
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: { files: 100 } // Limit to 100 files per batch
});

/**
 * GET /
 * Displays the upload forms and the user's (recursive) list of uploaded files.
 */
router.get('/', async (req, res) => {
    // `checkAuth` middleware has already run and confirmed req.session.userUuid
    const { t, langKey, userUuid } = res.locals;
    
    // User's specific upload directory
    const userUploadDir = path.join(UPLOAD_BASE_DIR, userUuid);

    let fileListHtml = '';
    try {
        const files = await getAllFiles(userUploadDir); // Pass the user-specific path

        if (files.length === 0) {
            fileListHtml = `<li>${t.noFiles}</li>`;
        } else {
            fileListHtml = files
                .sort()
                .map(file => {
                    // file = 'folder/image.png'
                    // URL needs to be /files/folder/image.png
                    const fileUrl = `/files/${file.split('/').map(encodeURIComponent).join('/')}`;
                    return `<li><a href="${fileUrl}" target="_blank">${file}</a></li>`;
                }).join('');
        }
    } catch (err) {
        logger.error("Could not read 'uploads' directory for user", { userUuid, error: err });
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
            h1 { margin: 0; }
            form { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; }
            input[type="file"] { display: block; margin-bottom: 12px; }
            button { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0056b3; }
            button:disabled { background: #9db2c9; cursor: not-allowed; } /* Updated disabled style */
            ul { list-style: none; padding-left: 0; }
            li { background: #eee; padding: 10px 12px; margin-bottom: 5px; border-radius: 4px; font-family: "Menlo", "Consolas", monospace; }
            li a { text-decoration: none; color: #0056b3; font-weight: 500; }
            li a:hover { text-decoration: underline; }
            .form-separator { height: 1px; background: #ddd; margin: 30px 0; }

            /* --- Updated & New Styles --- */
            header { 
                display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; 
                border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; gap: 15px; 
            }
            .user-info { 
                font-size: 0.9em; background: #eee; padding: 5px 10px; border-radius: 4px; 
                display: flex; align-items: center; gap: 8px; font-family: "Menlo", "Consolas", monospace;
                overflow: hidden;
            }
            .user-info span { flex-shrink: 0; }
            .user-info code { 
                background: #dcdcdc; padding: 2px 4px; border-radius: 3px; 
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            #copyUuidBtn { 
                background: #6c757d; color: white; padding: 3px 8px; border: none; 
                border-radius: 4px; cursor: pointer; font-size: 0.9em; flex-shrink: 0;
            }
            #copyUuidBtn:hover { background: #5a6268; }
            
            #logoutBtn { background: #dc3545; flex-shrink: 0; }
            #logoutBtn:hover { background: #c82333; }
            
            /* Modal Styles */
            .modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 1000;
            }
            .modal-content {
                background: white; padding: 25px; border-radius: 8px; max-width: 400px; width: 90%; text-align: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .modal-content h3 { margin-top: 0; color: #333; }
            .modal-content p { color: #555; }
            .modal-actions { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; }
            .modal-actions button { font-size: 15px; padding: 8px 14px; }
            #modalCancelBtn { background: #6c757d; }
            #modalCancelBtn:hover { background: #5a6268; }
            #modalConfirmBtn { background: #dc3545; }
            #modalConfirmBtn:hover { background: #c82333; }
        </style>
    </head>
    <body>
        <header>
            <h1>${t.header}</h1>

            <div class="user-info">
                <span>${t.currentUser}</span>
                <code id="currentUserUuid" title="${userUuid}">${userUuid}</code>
                <button id="copyUuidBtn" type="button">${t.copy}</button>
            </div>
            
            <form action="/auth/logout" method="GET" id="logoutForm" style="margin: 0; padding: 0; background: none;">
                <button id="logoutBtn" type="button">${t.logoutButton}</button>
            </form>
        </header>
        
        <main>
            <form action="/upload" method="POST" enctype="multipart/form-data">
                <label for="fileInput">${t.filesUploadLabel}</label>
                <input type="file" id="fileInput" name="uploadedFiles" multiple>
                <button type="submit" id="fileUploadBtn">${t.uploadButton}</button>
            </form>

            <div class="form-separator"></div>

            <form action="/upload" method="POST" enctype="multipart/form-data">
                <label for="folderInput">${t.folderUploadLabel}</label>
                <input type="file" id="folderInput" name="uploadedFiles" webkitdirectory directory multiple>
                <button type="submit" id="folderUploadBtn">${t.uploadButton}</button>
            </form>

            <h2>${t.fileListHeader}</h2>
            <ul>
                ${fileListHtml}
            </ul>
        </main>

        <div id="logoutModal" class="modal-overlay">
            <div class="modal-content">
                <h3>${t.logoutModalTitle}</h3>
                <p>${t.logoutConfirm}</p>
                <div class="modal-actions">
                    <button id="modalCancelBtn" type="button">${t.logoutModalCancel}</button>
                    <button id="modalConfirmBtn" type="button">${t.logoutModalConfirm}</button>
                </div>
            </div>
        </div>

        <script>
            // --- Copy UUID Logic ---
            const copyBtn = document.getElementById('copyUuidBtn');
            const uuidText = document.getElementById('currentUserUuid').textContent;
            
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(uuidText).then(() => {
                    copyBtn.textContent = '${t.copied}';
                    copyBtn.disabled = true;
                    setTimeout(() => {
                        copyBtn.textContent = '${t.copy}';
                        copyBtn.disabled = false;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy UUID: ', err);
                });
            });

            // --- Logout Modal Logic ---
            const logoutBtn = document.getElementById('logoutBtn');
            const logoutModal = document.getElementById('logoutModal');
            const cancelBtn = document.getElementById('modalCancelBtn');
            const confirmBtn = document.getElementById('modalConfirmBtn');
            const logoutForm = document.getElementById('logoutForm');

            // Show modal on logout click
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Stop default button action
                logoutModal.style.display = 'flex'; // Show modal
            });

            // Hide modal on cancel
            cancelBtn.addEventListener('click', () => {
                logoutModal.style.display = 'none'; // Hide modal
            });

            // Submit form on confirm
            confirmBtn.addEventListener('click', () => {
                logoutForm.submit(); // Submit the form
            });

            // Also hide modal if user clicks on the overlay background
            logoutModal.addEventListener('click', (e) => {
                if (e.target === logoutModal) {
                    logoutModal.style.display = 'none';
                }
            });

            // --- MODIFICATION: Upload Button Disable Logic ---
            const fileInput = document.getElementById('fileInput');
            const fileUploadBtn = document.getElementById('fileUploadBtn');
            const folderInput = document.getElementById('folderInput');
            const folderUploadBtn = document.getElementById('folderUploadBtn');

            // Disable buttons on page load
            fileUploadBtn.disabled = true;
            folderUploadBtn.disabled = true;

            // Add event listener for file input
            fileInput.addEventListener('change', () => {
                fileUploadBtn.disabled = fileInput.files.length === 0;
            });

            // Add event listener for folder input
            folderInput.addEventListener('change', () => {
                folderUploadBtn.disabled = folderInput.files.length === 0;
            });
            // --- End of Modification ---

        </script>
    </body>
    </html>
    `);
});

/**
 * POST /upload
 * Handles both multi-file and folder uploads for the authenticated user.
 */
router.post('/upload', (req, res, next) => {
    const { t, userUuid } = res.locals;

    const uploader = upload.array('uploadedFiles');

    uploader(req, res, function (err) {
        if (err) {
            logger.warn('File upload error', { userUuid, error: err.message, action: 'upload-fail' });
            return res.status(500).send(`Upload Error: ${err.message}`);
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).send(t.fileNotSelected);
        }

        // Log successful upload
        const uploadedFileNames = req.files.map(f => f.decodedName || f.originalname);
        logger.info(`Files uploaded successfully`, {
            userUuid,
            action: 'upload-success',
            files: uploadedFileNames,
            count: req.files.length
        });

        res.redirect('/');
    });
});

module.exports = router;