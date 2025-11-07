const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const { PORT, UPLOAD_BASE_DIR, LOG_DIR, COOKIE_SECRET, SESSION_MAX_AGE } = require('./config');
const logger = require('./logger');
const { getLocalIPs, getSystemLang, getTranslations } = require('./utils');
const { injectUser, checkAuth } = require('./middleware/auth');
const { requestLogger } = require('./middleware/requestLogger');

const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');

// --- Application Setup ---
const app = express();

// Ensure upload and log directories exist
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
    fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// --- Core Middleware ---

// 1. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Cookie parser
app.use(cookieParser(COOKIE_SECRET));

// 3. Session management
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
        maxAge: SESSION_MAX_AGE
    }
}));

// 4. Inject user and language info into res.locals for all routes
app.use(injectUser);

// 5. Request logging
app.use(requestLogger);


// --- Routes ---

// 1. Authentication routes (Login, Logout, etc.)
// These are public and do not need `checkAuth`
app.use('/auth', authRoutes);

// 2. Dynamic static file serving for authenticated users
// This route serves files *only* from the logged-in user's directory.
app.use('/files', checkAuth, (req, res, next) => {
    const userUuid = req.session.userUuid;
    const userUploadDir = path.join(UPLOAD_BASE_DIR, userUuid);

    // Create a static handler scoped to the user's directory
    const userStatic = express.static(userUploadDir);

    // Log the file access attempt
    logger.info(`File download request`, {
        userUuid,
        action: 'download',
        file: req.path
    });

    return userStatic(req, res, next);
});

// 3. Main application routes (Upload page, upload handler)
// These routes are protected by `checkAuth`
app.use('/', checkAuth, mainRoutes);


// --- Error Handling ---

// 404 Handler
app.use((req, res, next) => {
    res.status(404).send("Sorry, can't find that!");
});

// 500 Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled server error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        userUuid: req.session.userUuid
    });
    res.status(500).send('Something broke!');
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => {
    const t = getTranslations(getSystemLang());
    const ips = getLocalIPs();

    console.log(`\n${t.serverStarted} (${t.listeningOn} ${PORT})`);
    console.log(t.accessInstructions);
    
    console.log(`    - ${t.localhost} http://localhost:${PORT}`);
    
    if (ips.length > 0) {
        ips.forEach(ip => {
            console.log(`    - ${t.lan} http://${ip}:${PORT}`);
        });
    } else {
        console.log(`    - (${t.noLan})`);
    }
    console.log('\n'); // Add newline for cleaner log start
});