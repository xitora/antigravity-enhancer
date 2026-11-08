@echo off
title Antigravity Multi-Language Patch Installer
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply_patch.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Error] Setup failed with exit code %ERRORLEVEL%.
    pause
)
exit /b %ERRORLEVEL%
