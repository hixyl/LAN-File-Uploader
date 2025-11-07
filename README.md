# LAN File Uploader

A simple, self-hosted Node.js server for quickly uploading and sharing files on your local area network (LAN).

[中文](README.zh.md)

## Features

* **Simple Web Interface**: Upload files directly from your browser.
* **File Listing**: View all uploaded files on the main page.
* **Conflict Resolution**: Automatically renames files with a timestamp if a file with the same name already exists.
* **Encoding Fix**: Correctly handles non-ASCII (e.g., Chinese) filenames.
* **Multi-language**: Automatically detects browser language and switches between English (`en`) and Simplified Chinese (`zh`).

## Requirements

* [Node.js](https://nodejs.org/) (v14 or later)
* [npm](https://www.npmjs.com/) (usually included with Node.js)

## Installation

1.  Clone this repository or download the `index.js` file.
2.  Open a terminal in the directory where `index.js` is located.
3.  Install the required dependencies:

    ```bash
    npm install express multer
    ```

## How to Run

1.  From your terminal, run the server:

    ```bash
    node index.js
    ```

2.  The server will start and print the access URLs to the console:

    ```
    🚀 Server started! (Listening on port 3000)
    Access the server at:
        - Local: http://localhost:3000
        - LAN: [http://192.168.1.100:3000](http://192.168.1.100:3000) 
    ```

3.  Open any of the provided URLs in a web browser on any device connected to the same network (e.g., your computer or phone).

## How It Works

* **Server**: An `express` server listens on port `3000` on all available network interfaces (`0.0.0.0`).
* **Uploads**: `multer` is used to handle `multipart/form-data` (file uploads).
* **Storage**: Files are saved to an `uploads` directory created in the same folder as the script.
* **File Serving**: The `uploads` directory is served statically at the `/files` route, allowing you to access files directly (e.g., `http://[IP]:3000/files/example.txt`).