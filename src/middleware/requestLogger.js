const logger = require('../logger');

/**
 * Logs basic information for every incoming request.
 */
function requestLogger(req, res, next) {
    // Cache the userUuid at the start of the request,
    // as req.session might be destroyed by the time 'onFinished' runs (e.g., during logout).
    const userUuid = (req.session && req.session.userUuid) ? req.session.userUuid : 'anonymous';

    // Log at the start of the request
    logger.info(`Request: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userUuid: userUuid // Use the cached variable
    });

    // Log at the end of the request
    onFinished(res, () => {
        logger.info(`Response: ${req.method} ${req.originalUrl} ${res.statusCode}`, {
            userUuid: userUuid, // Use the cached (and safe) variable
            status: res.statusCode
        });
    });

    next();
}

/**
 * Helper to execute callback on response finish.
 * (Simplified version of on-finished package)
 */
function onFinished(res, listener) {
    res.once('finish', listener);
    res.once('close', listener);
}

module.exports = { requestLogger };