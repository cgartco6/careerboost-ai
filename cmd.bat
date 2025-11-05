# Install PM2 Windows service
pm2 startup
pm2 save

# Start your application
pm2 start server/server.js --name careerboost-ai
pm2 save
