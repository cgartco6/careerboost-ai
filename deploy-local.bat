@echo off
echo ====================================
echo CareerBoost AI Local Deployment
echo ====================================

echo Starting MongoDB service...
net start MongoDB

echo Installing dependencies...
call npm install

echo Creating uploads directory...
if not exist uploads mkdir uploads

echo Setting file permissions...
icacls uploads /grant "Users:(OI)(CI)F"

echo Initializing database...
call npm run setup-db

echo Starting application...
echo.
echo Application will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
