@echo off
echo Uploading files to Afrihost via FTP...

:: Replace with your FTP details
set HOST=ftp.yourdomain.co.za
set USER=your_username
set PASS=your_password

:: Upload public folder contents
cd public
ftp -s:ftp_commands.txt
cd ..

echo Upload complete!
