@echo off
echo ====================================
echo CareerBoost AI Production Deployment
echo ====================================

echo Starting MongoDB service...
net start MongoDB

echo Installing dependencies...
call npm install

echo Creating required directories...
if not exist uploads mkdir uploads
if not exist logs mkdir logs

echo Setting file permissions...
icacls uploads /grant "Users:(OI)(CI)F"
icacls logs /grant "Users:(OI)(CI)F"

echo Initializing database...
call npm run setup-db

echo Starting application with PM2...
call pm2 start server/server.js --name careerboost-ai

echo.
echo Application started successfully!
echo.
echo Check status: pm2 status
echo View logs: pm2 logs careerboost-ai
echo Stop application: pm2 stop careerboost-ai
echo.
echo Application available at: http://localhost:3000
echo.
pause
