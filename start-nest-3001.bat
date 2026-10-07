@echo off
cd /d "%~dp0"
set PORT=3001
set ALLOW_TEST_OTP=true
echo Starting GOZIPP Nest backend on port 3001...
echo DO NOT close this window. Wait for: GOZIPP Backend is running on port: 3001
node packages\api\dist\main.js
pause
