# LAN File Uploader

A simple, self-hosted Node.js server for quickly uploading and sharing files on your local area network (LAN).

This version includes multi-user support, where each user is isolated by a unique UUID.

[中文](README.zh.md)

## Features

* **User-Friendly Login**: Access the service using a simple UUID.
* **UUID Generation**: Generate a new UUID with a single click from the login page.
* **Isolated Storage**: Files are stored in separate folders on the server based on the user's UUID.
* **Simple Web Interface**: Upload files and folders directly from your browser.
* **File Listing**: View all your uploaded files (including files in folders) on the main page.
* **Secure Logout**: A logout button securely ends your session and *permanently deletes all your files*.
* **Conflict Resolution**: Automatically renames files with a timestamp if a file with the same name already exists.
* **Encoding Fix**: Correctly handles non-ASCII (e.g., Chinese) filenames.
* **Multi-language**: Automatically detects browser language and switches between English (`en`) and Simplified Chinese (`zh`).
* **Logging**: Records user activity (login, upload, download, logout) to log files in the `/logs` directory.

## Requirements

* [Node.js](https://nodejs.org/) (v14.14.0 or later, for `fs.rm`)
* [npm](https://www.npmjs.com/) (usually included with Node.js)

## Installation

1.  Clone this repository or download the source code.
2.  Open a terminal in the project's root directory.
3.  Install the required dependencies:

    ```bash
    npm install express multer cookie-parser express-session uuid winston winston-daily-rotate-file
    ```

## How to Run

1.  From your terminal, run the server:

    ```bash
    npm start
    ```
    (This runs `node src/server.js` as defined in `package.json`)

2.  The server will start and print the access URLs to the console:

    ```
    🚀 Server started! (Listening on port 3000)
    Access the server at:
        - Local: http://localhost:3000
        - LAN: [http://192.168.1.100:3000](http://192.168.1.100:3000)
    ```

3.  Open any of the provided URLs in a web browser.
4.  You will be prompted to log in. You can paste an existing UUID or click "Generate New UUID" to create one.
5.  Start uploading files. Your files are now only accessible to sessions using your UUID.

## How It Works

* **Server**: An `express` server listens on port `3000` on all available network interfaces (`0.0.0.0`).
* **Authentication**: User sessions are managed by `express-session` and `cookie-parser`. A unique UUID, stored in the session, identifies the user.
* **Uploads**: `multer` is used to handle `multipart/form-data` (file uploads).
* **Storage**: Files are saved to a user-specific directory: `uploads/<USER-UUID>/`.
* **File Serving**: The `/files` route is dynamically protected to only serve files from the logged-in user's specific directory.
* **Logging**: `winston` is used to create rotating log files in the `logs/` directory, tracking user actions.