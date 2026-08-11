const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

async function initDatabase() {
  const dbConfig = config.db;
  const tempConnection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await tempConnection.end();

  pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(64) PRIMARY KEY,
      speaker_id INT NOT NULL DEFAULT 3,
      pitch FLOAT NOT NULL DEFAULT 0.0,
      speed FLOAT NOT NULL DEFAULT 1.0,
      intonation FLOAT NOT NULL DEFAULT 1.0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS server_settings (
      server_id VARCHAR(64) PRIMARY KEY,
      max_length INT NOT NULL DEFAULT 50,
      join_notice_enabled TINYINT(1) NOT NULL DEFAULT 1,
      volume FLOAT NOT NULL DEFAULT 1.0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dictionary (
      server_id VARCHAR(64) NOT NULL,
      word VARCHAR(255) NOT NULL,
      reading VARCHAR(255) NOT NULL,
      PRIMARY KEY (server_id, word)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS autojoin_settings (
      server_id VARCHAR(64) PRIMARY KEY,
      voice_channel_id VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try { await pool.query('ALTER TABLE users ADD COLUMN intonation FLOAT NOT NULL DEFAULT 1.0'); } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') console.error(e); }
  try { await pool.query('ALTER TABLE server_settings ADD COLUMN volume FLOAT NOT NULL DEFAULT 1.0'); } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') console.error(e); }

  console.log('Database initialization completed successfully.');
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }
  return pool;
}

module.exports = {
  initDatabase,
  getPool,
};
