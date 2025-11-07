const express = require('express');
const { generateUuid, isValidUuid } = require('../utils');
const logger = require('../logger');
const path = require('path');
const fs = require('fs').promises;
const { UPLOAD_BASE_DIR } = require('../config');

const router = express.Router();

/**
 * GET /auth/login
 * Renders the login page.
 */
router.get('/login', (req, res) => {
    // If already logged in, redirect to home
    if (req.session.userUuid) {
        return res.redirect('/');
    }

    const { t, langKey } = res.locals;

    // Get flash error message from session if it exists
    // (This is still needed as a fallback for server-side errors)
    const error = req.session.loginError;
    delete req.session.loginError; // Clear error after reading

    res.send(`
    <!DOCTYPE html>
    <html lang="${langKey}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title} - ${t.loginHeader}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 500px; margin: 40px auto; padding: 0 15px; background: #fdfdfd; color: #333; }
            h1 { text-align: center; }
            form { background: #f4f4f4; padding: 25px; border-radius: 8px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; }
            input[type="text"] { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
            button:hover { background: #0056b3; }
            
            #registerBtn { background: #28a745; margin-top: 10px; }
            #registerBtn:hover { background: #218838; }

            .error-message {
                color: #721c24;
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                padding: 10px 15px;
                border-radius: 4px;
                margin-bottom: 15px;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <h1>${t.loginHeader}</h1>

        ${error ? `<div class="error-message">${error}</div>` : ''}

        <form action="/auth/login" method="POST">
            <label for="uuid">${t.uuidLabel}</label>
            
            <input type="text" id="uuid" name="userUuid" 
                   required 
                   pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
                   title="${t.invalidUuidError}">
            
            <button type="submit">${t.loginButton}</button>
            <button type="button" id="registerBtn">${t.registerButton}</button>
        </form>

        <script>
            document.getElementById('registerBtn').addEventListener('click', () => {
                window.location.href = '/auth/register';
            });
        </script>
    </body>
    </html>
    `);
});

/**
 * POST /auth/login
 * Handles the login form submission.
 */
router.post('/login', (req, res) => {
    const { userUuid } = req.body;
    const { t } = res.locals; // Get translations

    // 这是一个重要的安全措施，防止有人绕过浏览器验证。
    if (!isValidUuid(userUuid)) {
        req.session.loginError = t.invalidUuidError;
        return res.redirect('/auth/login');
    }
    
    // UUID format is valid, proceed with login
    req.session.userUuid = userUuid;

    logger.info(`User login succeeded`, {
        ip: req.ip,
        userUuid: userUuid,
        action: 'login'
    });

    res.redirect('/');
});

/**
 * GET /auth/register
 * Generates a new UUID, logs the user in, and redirects to home.
 */
router.get('/register', async (req, res) => {
    const { t } = res.locals;
    try {
        const newUuid = await generateUuid();
        req.session.userUuid = newUuid;

        logger.info(`New user registered and logged in`, {
            ip: req.ip,
            userUuid: newUuid,
            action: 'register'
        });

        res.redirect('/');
    } catch (err) {
        logger.error('Failed to register new user', { error: err.message, ip: req.ip });
        req.session.loginError = t.registerError;
        res.redirect('/auth/login');
    }
});


/**
 * GET /auth/logout
 * Logs the user out, deletes their files, and destroys the session.
 */
router.get('/logout', async (req, res) => {
    const userUuid = req.session.userUuid;

    if (userUuid) {
        const userUploadDir = path.join(UPLOAD_BASE_DIR, userUuid);

        // Destroy the session first
        req.session.destroy(async (err) => {
            if (err) {
                logger.error('Failed to destroy session', { error: err, userUuid });
            }

            // Asynchronously delete the user's file directory
            try {
                await fs.rm(userUploadDir, { recursive: true, force: true });
                logger.info(`Successfully deleted user directory`, {
                    userUuid,
                    action: 'logout-delete',
                    path: userUploadDir
                });
            } catch (fsErr) {
                if (fsErr.code !== 'ENOENT') { // Ignore "Not Found" errors
                    logger.error('Failed to delete user directory', {
                        error: fsErr,
                        userUuid,
                        path: userUploadDir
                    });
                }
            }
            
            res.redirect('/auth/login');
        });

    } else {
        res.redirect('/auth/login');
    }
});

module.exports = router;