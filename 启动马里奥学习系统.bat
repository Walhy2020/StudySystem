@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PYTHON_EXE="
if exist "C:\Users\St\AppData\Local\Programs\Python\Python312\python.exe" set "PYTHON_EXE=C:\Users\St\AppData\Local\Programs\Python\Python312\python.exe"
if not defined PYTHON_EXE (
  python --version >nul 2>nul
  if not errorlevel 1 set "PYTHON_EXE=python"
)
if not defined PYTHON_EXE (
  py --version >nul 2>nul
  if not errorlevel 1 set "PYTHON_EXE=py"
)
if not defined PYTHON_EXE (
  echo Python 3 was not found.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5177/"
"%PYTHON_EXE%" server.py --port 5177 --bind 127.0.0.1
