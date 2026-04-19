@echo off
setlocal
set PORT=8000

echo [1/3] Freeing dev ports (8000 9000 9100)...
for %%p in (8000 9000 9100) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%%p " ^| findstr LISTENING') do (
        echo   Killing PID %%a on port %%p
        taskkill /PID %%a /F >nul 2>&1
    )
)
timeout /t 2 /nobreak >nul

echo [2/3] Clearing Python bytecode cache...
for /d /r . %%d in (__pycache__) do (
    if exist "%%d" rd /s /q "%%d" 2>nul
)

echo [3/3] Starting backend on port %PORT%...
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
uvicorn app.main:app --host 0.0.0.0 --port %PORT% --log-level info
