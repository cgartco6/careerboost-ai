@echo off
:monitor
cls
echo CareerBoost AI Monitor - %date% %time%
echo ====================================
echo.
pm2 status
echo.
echo Memory Usage:
node -e "console.log(process.memoryUsage())"
echo.
echo Uptime:
node -e "console.log('Server uptime: ' + Math.floor(process.uptime()/60) + ' minutes')"
echo.
timeout /t 30 /nobreak > nul
goto monitor
