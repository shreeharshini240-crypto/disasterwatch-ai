@echo off
cd /d "%~dp0"
echo Starting DisasterWatch AI web server at %date% %time% > "%~dp0web-start.log"
"C:\Program Files\nodejs\npm.cmd" run start --workspace @disasterwatch/web >> "%~dp0web-start.log" 2>&1
echo Exit code %errorlevel% >> "%~dp0web-start.log"
