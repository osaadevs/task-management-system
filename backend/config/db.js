const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'tms_db'
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('MySQL Database connected successfully!');
});

const db = {
  query: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    return connection.query(sql, params, callback);
  },
  promise: () => ({
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve([results, []]);
        });
      });
    }
  }),
  connectWithFallback: async () => Promise.resolve(connection),
  getActiveConfigLabel: () => 'localhost:3307',
};

module.exports = db;