@echo off
echo Installing CareerBoost AI as Windows Service...

:: Install PM2 service
pm2 startup
pm2 start server/server.js --name careerboost-ai
pm2 save

echo.
echo Service installed successfully!
echo The application will start automatically on system boot.
echo.
echo Management commands:
echo   pm2 status          - Check status
echo   pm2 logs careerboost-ai - View logs
echo   pm2 stop careerboost-ai - Stop application
echo   pm2 restart careerboost-ai - Restart application
echo.
pause
