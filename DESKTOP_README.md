# MediaHub Desktop Application

This document provides instructions for the MediaHub desktop application, packaged using Electron.

## Overview

The MediaHub desktop application bundles the web-based media server and client, allowing you to run it as a standalone application on Windows, macOS, and Linux. It retains all core functionalities, including local media library management, user authentication, media sharing, "Watch Together", and external content streaming search.

## Features

*   Cross-platform (Windows, macOS, Linux)
*   Bundled Node.js server and React client
*   Local media playback (video, audio)
*   User accounts and progress tracking
*   Media sharing
*   Watch Together (WebSockets)
*   External streaming search (e621, Rule34)
*   Native application menu

## Development

### Prerequisites

*   Node.js (version recommended by the project, e.g., v18 or later)
*   npm (usually comes with Node.js)

### Setup

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install root dependencies:**
    (These include Electron, electron-builder, and development utilities)
    ```bash
    npm install
    ```

3.  **Install client dependencies:**
    ```bash
    cd client
    npm install
    cd ..
    ```

4.  **Install server dependencies:**
    ```bash
    cd server
    npm install
    cd ..
    ```

### Running in Development Mode

To run the application in development mode with live reloading for the client and server:

```bash
npm run dev
```

This command will:
*   Start the React development server for the client (usually on `http://localhost:3000`).
*   Start the Node.js server (usually on `http://localhost:3001`).
*   Launch the Electron application, which will load the client from the React dev server.
*   Hot-reloading will be active for the client. Changes to the server code will require a manual restart of the `npm run dev` command if not handled by a tool like `nodemon` (which is not currently configured in the root `dev` script for the server part).

### Building the Client for Production Manually

To build the React client for production (output to `client/build`):

```bash
npm run build:client
```

## Packaging for Distribution

To package the application for your current platform:

```bash
npm run package
```

This command will:
1.  Build the React client (`npm run build:client`).
2.  Run `electron-builder` to create distributable packages in the `dist/` directory.

Targets:
*   **Windows:** `.exe` installer (NSIS)
*   **macOS:** `.dmg` file
*   **Linux:** `.AppImage`

### Cross-Platform Building

To build for a specific platform (e.g., from macOS build for Windows):
*   `npm run package -- --win`
*   `npm run package -- --mac`
*   `npm run package -- --linux`

(Note: Building for macOS requires a macOS environment. Building for Windows may require specific tools like Wine on non-Windows platforms, or a Windows environment.)

## Application Data

*   **Database:** The application's SQLite database is typically stored in the user data directory.
    *   Windows: `C:\Users\<username>\AppData\Roaming\MediaHub\database.sqlite` (or similar, depends on actual productName)
    *   macOS: `~/Library/Application Support/MediaHub/database.sqlite`
    *   Linux: `~/.config/MediaHub/database.sqlite`
    (The exact path for the database depends on how the server is configured to use `app.getPath('userData')`. This needs to be verified post-packaging if changes were made to use this path. Currently, the server uses a relative path `server/database/database.sqlite` which will be packaged within the app.)

*   **Media Library:** The default media library is expected to be within the `server/media_library` directory, which is packaged with the application. For user-added media, the application may need configuration options (potentially using the directory selection dialog implemented as an enhancement).

## Using the Application

Once installed or launched (e.g., via AppImage):
1.  The application will start the local Node.js server in the background.
2.  The React client UI will be displayed.
3.  All features of the web application should be available.
