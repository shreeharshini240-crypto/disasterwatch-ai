@echo off
cd /d "%~dp0apps\web"
echo Starting direct Next server at %date% %time% > "%~dp0web-direct.log"
"C:\Program Files\nodejs\node.exe" "%~dp0node_modules\next\dist\bin\next" start -p 3000 >> "%~dp0web-direct.log" 2>&1
echo Exit code %errorlevel% >> "%~dp0web-direct.log"
