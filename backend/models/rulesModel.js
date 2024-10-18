const sqlite3 = require("sqlite3").verbose();  // Using sqlite3
const { open } = require("sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "../db/ruleEngine.db");

async function createDatabase() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,  // Using sqlite3 as the driver
  });

  // SQL query to create the 'rules' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_string TEXT NOT NULL,
      ast_structure TEXT, -- JSON string representing the AST
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Rules table created successfully");
  return db;
}

module.exports = createDatabase; 