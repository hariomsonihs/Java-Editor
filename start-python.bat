@echo off
echo ========================================
echo   Java Editor - Python Server
echo ========================================
echo.

echo Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not installed!
    echo Install from: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python installed
echo.

echo Checking Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java not installed!
    echo Install from: https://adoptium.net/
    pause
    exit /b 1
)
echo [OK] Java installed
echo.

echo Installing dependencies...
pip install flask flask-cors
echo.

echo Starting server...
python server_python.py
