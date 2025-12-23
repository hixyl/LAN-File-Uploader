const express = require('express');
const { generateUserUuid, validateCredentials } = require('../utils');
const logger = require('../logger');
const path = require('path');
const fs = require('fs').promises;
const { UPLOAD_BASE_DIR } = require('../config');

const router = express.Router();

/**
 * GET /auth/login
 */
router.get('/login', (req, res) => {
    if (req.session.userUuid) {
        return res.redirect('/');
    }

    const { t, langKey } = res.locals;
    const error = req.session.loginError;
    delete req.session.loginError;

    res.send(`
    <!DOCTYPE html>
    <html lang="${langKey}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title} - ${t.loginHeader}</title>
        <style>
            body { font-family: -apple-system, sans-serif; max-width: 400px; margin: 60px auto; padding: 0 20px; background: #fdfdfd; }
            h1 { text-align: center; color: #333; }
            form { background: #f4f4f4; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
            label { display: block; margin-bottom: 6px; font-weight: 500; }
            input { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { background: #007bff; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; font-weight: 600; }
            button:hover { background: #0056b3; }
            .error-message { color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; text-align: center; }
            .hint { font-size: 0.8em; color: #666; margin-top: -15px; margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <h1>${t.loginHeader}</h1>

        ${error ? `<div class="error-message">${error}</div>` : ''}

        <form action="/auth/login" method="POST">
            <label for="username">${t.usernameLabel}</label>
            <input type="text" id="username" name="username" required autocomplete="username">
            
            <label for="password">${t.passwordLabel}</label>
            <input type="password" id="password" name="password" required autocomplete="current-password">
            
            <button type="submit">${t.loginButton}</button>
        </form>
    </body>
    </html>
    `);
});

/**
 * POST /auth/login
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const { t } = res.locals;

    // if (!validateCredentials(username, password)) {
    //     req.session.loginError = t.invalidCredsError;
    //     return res.redirect('/auth/login');
    // }
    
    // Map user/pass to a stable UUID
    const userUuid = generateUserUuid(username, password);
    req.session.userUuid = userUuid;
    req.session.username = username; // Store display name

    logger.info(`User access granted`, {
        action: 'login',
        username: username,
        userUuid: userUuid
    });

    res.redirect('/');
});

/**
 * GET /auth/logout
 */
router.get('/logout', async (req, res) => {
    const userUuid = req.session.userUuid;

    if (userUuid) {
        const userUploadDir = path.join(UPLOAD_BASE_DIR, userUuid);

        req.session.destroy(async (err) => {
            if (err) logger.error('Session destruction failed', { error: err, userUuid });

            try {
                await fs.rm(userUploadDir, { recursive: true, force: true });
                logger.info(`User directory deleted on logout`, { userUuid, action: 'logout-delete' });
            } catch (fsErr) {
                if (fsErr.code !== 'ENOENT') {
                    logger.error('Failed to clean user directory', { error: fsErr, userUuid });
                }
            }
            res.redirect('/auth/login');
        });
    } else {
        res.redirect('/auth/login');
    }
});

module.exports = router;