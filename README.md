# video-player
## 8. Windows Deployment Guide

This section provides instructions for deploying and running the Media Hub application on a Windows operating system.

### Prerequisites

1.  **Node.js**:
    *   Download and install Node.js for Windows from [nodejs.org](https://nodejs.org/). LTS version is recommended (e.g., v18.x or later).
    *   Ensure Node.js and npm are added to your system's PATH during installation (this is usually the default). You can verify by opening Command Prompt and typing `node -v` and `npm -v`.

### Preparing Application Files

1.  **Get the Code**:
    *   **Option A (Git)**: If you have Git installed, clone the repository:
        ```bash
        git clone <repository-url>
        cd <project-directory>
        ```
    *   **Option B (Manual Download/Extract)**: If you have the project files as a ZIP, extract them to a folder on your Windows machine (e.g., `C:\MediaHub`).

2.  **Install Dependencies**:
    *   Open Command Prompt or PowerShell.
    *   **Server Dependencies**: Navigate to the server directory (e.g., `cd C:\MediaHub\app\server`) and run:
        ```bash
        npm install --omit=dev
        ```
        The `--omit=dev` flag is recommended for production to skip development-only packages.
    *   **Client Dependencies**: Navigate to the client directory (e.g., `cd C:\MediaHub\app\client`) and run:
        ```bash
        npm install --omit=dev
        ```
        (Note: For the client, `npm install` without flags is also fine as build step will optimize.)

3.  **Build the Client Application**:
    *   While still in the client directory (`/app/client`), run the build script:
        ```bash
        npm run build
        ```
    *   This will create a `build` folder inside `/app/client` containing the optimized static files for the frontend. If this step fails, check previous logs for errors like missing `react-scripts` or issues with package exports (e.g. Plyr CSS, Axios ESM). Using `npx react-scripts build` can sometimes resolve path issues for `react-scripts`.

### Configuration

1.  **Environment Variables (Server)**:
    *   The server uses environment variables for critical settings. For Windows, you can set these system-wide, user-wide, or via a `.env` file in the `/app/server` directory.
    *   **Using `.env` file (Recommended for ease)**:
        *   In the `/app/server` directory, copy `.env.example` to a new file named `.env`.
        *   Edit `.env` with a text editor:
            *   ****: This is critical. The `start-server.bat` script also attempts to set this for its session.
            *   ****: **VERY IMPORTANT!** Replace the placeholder with a long, random, secure string (e.g., from a password generator). This is essential for security.
            *   ****: (Optional) Define if you need to use a port other than the default 3001.
    *   **Using System/User Environment Variables**:
        *   Search for "environment variables" in Windows Start Menu.
        *   Add/Edit variables like `NODE_ENV`, `JWT_SECRET`, `PORT`. System variables apply to all users; user variables apply only to the current user. Changes here may require a system restart or new command prompt session to take effect.

2.  **Media Directories (Server)**:
    *   Open `/app/server/index.js` in a text editor.
    *   Locate the `APP_MEDIA_DIRECTORIES` array.
    *   Modify the paths to point to your actual media library folders on your Windows machine. **Use absolute paths. On Windows, paths in JavaScript can use forward slashes `/` or escaped backslashes `\\`.**
        Example:
        ```javascript
        const APP_MEDIA_DIRECTORIES = [
            path.resolve('C:/Users/YourUser/Videos'),       // Forward slashes
            path.resolve('D:\\My Music Collection'),        // Escaped backslashes
            path.resolve(__dirname, 'media_library/uploads') // Default upload location (relative to server)
        ];
        ```
    *   Ensure the user account under which the server will run has read access to these directories. The `uploads` subdirectory inside `media_library` (relative to the server) will be created automatically by the server if it doesn't exist.

3.  **SQLite Database Location**:
    *   The SQLite database file (`database.sqlite` or `test_database.sqlite`) will be created in the `/app/server/database/` directory. Ensure this location is writable by the server process.

### Running the Application

1.  **Navigate to the Server Directory**:
    *   Open Command Prompt or PowerShell.
    *   Change to the server directory: `cd C:\MediaHub\app\server` (or your installation path).

2.  **Run the Startup Script**:
    *   Execute the batch file:
        ```bash
        start-server.bat
        ```
    *   This script will:
        1.  Set `NODE_ENV=production` for the current session.
        2.  Run `npm install --omit=dev` to ensure production server dependencies are met.
        3.  Start the Node.js server (`node index.js`).
    *   A console window will remain open showing server logs. If there are errors during startup (e.g., port in use, database issues), they will be displayed here.

3.  **Access in Browser**:
    *   Once the server is running (you should see a message like "[Server] HTTP and WebSocket Server listening on port 3001"), open your web browser.
    *   Navigate to `http://localhost:3001` (or your configured port).
    *   You should see the Media Hub application interface, served directly by the Node.js server.

4.  **Stopping the Server**:
    *   Close the `start-server.bat` console window, or press `Ctrl+C` in that window and confirm if prompted.

### Windows Firewall

*   If you cannot access Media Hub from other devices on your local network (or if Windows Defender prompts you), you may need to create an inbound rule in the Windows Defender Firewall to allow connections to the port the server is using (e.g., TCP port 3001). Search for "Windows Defender Firewall with Advanced Security" to manage rules.

This concludes the basic Windows deployment guide. For more advanced scenarios like running as a Windows service or using a reverse proxy like IIS or Nginx, further research and configuration would be required.

## Desktop Application

A standalone desktop version of MediaHub is also available, packaged with Electron.
For instructions on how to build, run, and use the desktop application, please see [DESKTOP_README.md](./DESKTOP_README.md).
