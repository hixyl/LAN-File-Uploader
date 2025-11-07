const { getLang, getTranslations } = require('../utils');

/**
 * Injects user and language info into res.locals for all routes.
 */
function injectUser(req, res, next) {
    res.locals.userUuid = req.session.userUuid || null;
    
    const langKey = getLang(req);
    res.locals.langKey = langKey;
    res.locals.t = getTranslations(langKey);
    
    next();
}

/**
 * Middleware to protect routes.
 * Redirects to login if the user is not authenticated.
 */
function checkAuth(req, res, next) {
    if (!req.session.userUuid) {
        // Not authenticated
        return res.redirect('/auth/login');
    }
    // Authenticated
    next();
}

module.exports = {
    injectUser,
    checkAuth
};