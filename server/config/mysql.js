const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost', // Replace with Afrihost DB host
  user: 'your_username', // Afrihost DB username
  password: 'your_password', // Afrihost DB password
  database: 'your_database', // Afrihost DB name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
