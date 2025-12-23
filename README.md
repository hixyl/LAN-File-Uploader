# LAN File Uploader

A simple, self-hosted Node.js server for quickly uploading and sharing files on your local area network (LAN). 

This version features a decentralized user isolation system. Instead of a database, it uses a deterministic algorithm to map your credentials to a private storage space.

[中文](README.zh.md)

## Features

* **Credential-Based Access**: Log in with any username and password. No registration required—existing credentials automatically restore access to your previous files.
* **Deterministic Isolation**: The server uses a SHA-256 hash of your username and password to generate a unique, stable UUID. This ensures your files are kept in a private directory without needing a database.
* **Isolated Storage**: Files are stored in separate folders on the server based on the generated UUID: `uploads/<USER-UUID>/`.
* **Simple Web Interface**: Upload multiple files or entire folders directly from your browser.
* **Secure Logout**: The logout process ends your session and *permanently deletes* all files associated with your credentials from the server.
* **Automatic Conflict Resolution**: Renames files with a timestamp if a collision occurs.
* **Multi-language Support**: Automatically detects browser language (supports English and Simplified Chinese).
* **Activity Logging**: Records all actions (login, upload, download, logout) in the `/logs` directory using rotating log files.

## Requirements

* [Node.js](https://nodejs.org/) (v14.14.0 or later)
* [npm](https://www.npmjs.com/)

## Installation

1.  Clone or download the repository.
2.  Open a terminal in the project's root directory.
3.  Install dependencies:
    ```bash
    npm install
    ```

## How to Run

1.  Start the server:
    ```bash
    npm start
    ```
2.  The console will display the access URLs:
    ```
    🚀 Server started! (Listening on port 3000)
    Access the server at:
        - Local: http://localhost:3000
        - LAN: [http://192.168.](http://192.168.)x.x:3000
    ```
3.  Open the URL in your browser.
4.  Enter any **Username** (3-20 chars) and **Password** (min 6 chars) to log in.

## How It Works

* **Authentication**: The server combines the username and password into a string, hashes it with SHA-256, and formats it as a UUID v4. This UUID identifies your session and folder.
* **File Serving**: The `/files` route is protected; it only serves files from the directory mapped to the currently logged-in user.
* **Storage Management**: Files are saved to `uploads/<UUID>`. When you log out, the server recursively removes this specific directory to ensure privacy.