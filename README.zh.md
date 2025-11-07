# 局域网文件上传器

一个简单的、自托管的 Node.js 服务器，用于在您的局域网 (LAN) 内快速上传和分享文件。

[English](README.md)

## 功能特性

* **简洁的 Web 界面**：直接从浏览器上传文件。
* **文件列表**：在主页上查看所有已上传的文件。
* **解决冲突**：如果已存在同名文件，会自动添加时间戳重命名。
* **编码修复**：正确处理非 ASCII（例如中文）文件名，防止乱码。
* **多语言支持**：自动检测浏览器语言，在英文 (`en`) 和简体中文 (`zh`) 之间切换。

## 环境要求

* [Node.js](https://nodejs.org/) (v14 或更高版本)
* [npm](https://www.npmjs.com/) (通常随 Node.js 一起安装)

## 安装

1.  克隆此仓库或下载 `index.js` 文件。
2.  在 `index.js` 所在的目录中打开一个终端。
3.  安装所需的依赖：

    ```bash
    npm install express multer
    ```

## 如何运行

1.  在终端中，运行服务器：

    ```bash
    node index.js
    ```

2.  服务器启动后，将在控制台中打印访问 URL：

    ```
    🚀 Server started! (Listening on port 3000)
    Access the server at:
        - Local: http://localhost:3000
        - LAN: [http://192.168.1.100:3000](http://192.168.1.100:3000) 
    ```

3.  在连接到同一网络的任何设备（例如您的电脑或手机）上的浏览器中，打开上述任意一个 URL。

## 工作原理

* **服务器**：一个 `express` 服务器在 `0.0.0.0` (所有网络接口) 的 `3000` 端口上进行监听。
* **上传**：使用 `multer` 来处理 `multipart/form-data` (文件上传)。
* **存储**：文件被保存到与脚本位于同一文件夹中的 `uploads` 目录。
* **文件服务**：`uploads` 目录通过 `/files` 路由进行静态托管，允许您直接访问文件 (例如 `http://[IP]:3000/files/示例.txt`)。