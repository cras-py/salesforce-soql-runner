@echo off
echo Starting Salesforce SOQL Runner...
echo.
echo Starting backend server...
start "SOQL Runner Server" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak > nul
echo.
echo Starting frontend client...
start "SOQL Runner Client" cmd /k "cd client && npm start"
echo.
echo Both server and client are starting...
echo Server will be available at: http://localhost:5000
echo Client will be available at: http://localhost:3000
echo.
pause 