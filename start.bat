@echo off
title Sales Manager - Importex

echo ============================================
echo   Iniciando Sales Manager Importex
echo ============================================
echo.

:: --- Iniciar el Backend (FastAPI) ---
echo [1/2] Iniciando Backend (FastAPI en puerto 8000)...
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate && uvicorn main:app --reload"

:: Esperar 3 segundos para que el backend arranque primero
timeout /t 3 /nobreak >nul

:: --- Iniciar el Frontend (Vite + React) ---
echo [2/2] Iniciando Frontend (Vite en puerto 5173)...
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   Todo listo!
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo   (Cierra las ventanas de cmd para detener los servicios)
echo.
pause
