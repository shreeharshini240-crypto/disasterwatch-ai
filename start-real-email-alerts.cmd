@echo off
cd /d "%~dp0"
if not exist .env.real-alerts (
  echo Create .env.real-alerts first. See .env.real-alerts.example
  pause
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in (".env.real-alerts") do (
  if not "%%A"=="" set "%%A=%%B"
)
"C:\Program Files\nodejs\node.exe" real-alert-server.cjs
