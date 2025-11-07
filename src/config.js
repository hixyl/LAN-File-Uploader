const path = require('path');

module.exports = {
    PORT: 3000,
    UPLOAD_BASE_DIR: path.join(__dirname, '..', 'uploads'),
    LOG_DIR: path.join(__dirname, '..', 'logs'),
    COOKIE_SECRET: 'your-very-secret-key-change-this', // Please change this to a random string
    SESSION_MAX_AGE: 1000 * 60 * 60 * 24 * 7 // 7 days
};