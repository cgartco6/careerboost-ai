@echo off
echo Starting CareerBoost AI Backup...

set BACKUP_DIR=C:\CareerBoostAI\backups
set DATE=%date:~6,4%-%date:~3,2%-%date:~0,2%

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

echo Backing up database...
mongodump --db careerboost --out %BACKUP_DIR%\db_%DATE%

echo Backing up uploads...
xcopy uploads %BACKUP_DIR%\uploads_%DATE% /E /I /H

echo Backing up logs...
xcopy logs %BACKUP_DIR%\logs_%DATE% /E /I /H

echo Backup completed: %BACKUP_DIR%\backup_%DATE%.zip
pause
