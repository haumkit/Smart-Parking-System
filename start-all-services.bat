@echo off
echo ========================================
echo   Smart Parking System - Start All Services
echo ========================================
echo.

:: Start MongoDB in Docker
echo [1/5] Checking MongoDB...
docker ps -a | findstr mongodb >nul
if %errorlevel% == 0 (
    echo MongoDB container exists
    docker start mongodb >nul 2>&1
    echo MongoDB started
) else (
    echo MongoDB not found. Creating container...
    docker run -d -p 27017:27017 --name mongodb mongo:latest
    echo MongoDB created and started
)
timeout /t 2 >nul

:: Start AI Server
echo [2/5] Starting AI Server...
start "AI Server" cmd /k "cd ai_server && venv\Scripts\activate && python app.py"

:: Wait for AI server
echo Waiting for AI Server to start...
timeout /t 5 >nul

:: Start Backend
echo [3/5] Starting Backend...
start "Backend" cmd /k "cd backend && npm start"

:: Wait for backend
echo Waiting for Backend to start...
timeout /t 5 >nul

:: Start Frontend
echo [4/5] Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

:: Wait for frontend
echo Waiting for Frontend to start...
timeout /t 3 >nul

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo Access URLs:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000
echo   AI Server: http://localhost:5001
echo.
echo MongoDB: mongodb://localhost:27017/smart_parking
echo.
echo Press any key to close this window...
pause >nul

