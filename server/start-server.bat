@echo off
PUSHD %~dp0
echo Starting Media Hub Server...
echo.

REM Set NODE_ENV to production for this session
echo Setting NODE_ENV to production...
set NODE_ENV=production
echo NODE_ENV is %NODE_ENV%
echo.

echo Ensuring server dependencies are installed (production only)...
npm install --omit=dev
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install server dependencies.
    echo Please check your npm and network connection, then try again.
    pause
    REM Removed "exit /b %ERRORLEVEL%" to comply with tool restrictions
    goto :eof
)
echo Server dependencies are up to date.
echo.

echo Launching Node.js server (index.js)...
echo If the server starts successfully, you can access the application at http://localhost:3001 (or your configured port).
echo Close this window or press Ctrl+C to stop the server.
echo.

node index.js

echo.
echo Server has exited.
pause
:eof
