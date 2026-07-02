const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'novapay.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // 1. Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 10000.00,
      card_number TEXT UNIQUE NOT NULL,
      card_frozen INTEGER DEFAULT 0,
      biometrics_active INTEGER DEFAULT 1
    )`);

        // 2. Create Transactions Table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      party TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

        // 3. Create Bills Table
        db.run(`CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company TEXT NOT NULL,
      amount REAL NOT NULL,
      paid INTEGER DEFAULT 0,
      icon TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

        // Seed default records if empty
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) {
                console.error('Error checking users count:', err);
                return;
            }
            if (row.count === 0) {
                console.log('Seeding default users and records...');
                seedData();
            }
        });

    });
}

function seedData() {
    // Passwords will be stored in plain text for simplicity or sha256. Let's do plain text for demo, but clearly explain login validations. 
    // Let's seed Alex Mercer (alex@novapay.co) with password 'alex123'
    // Seed secondary users for peer-to-peer transfers
    const alexCard = '**** **** **** 8824';

    db.run(`INSERT INTO users (name, email, password, balance, card_number, card_frozen, biometrics_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Alex Mercer', 'alex@novapay.co', 'alex123', 14250.80, alexCard, 0, 1],
        function (err) {
            if (err) {
                console.error('Error seeding Alex Mercer:', err);
                return;
            }
            const alexId = this.lastID;
            console.log('Seeded User Alex Mercer, ID:', alexId);

            // Seed core transfer users (Jessica L, Michael K, Sarah L)
            db.run(`INSERT INTO users (name, email, password, balance, card_number, card_frozen, biometrics_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, ['Jessica Taylor', 'jessica@novapay.co', 'jessica123', 8200.00, '**** **** **** 1111', 0, 1]);

            db.run(`INSERT INTO users (name, email, password, balance, card_number, card_frozen, biometrics_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, ['Michael K.', 'michael@novapay.co', 'michael123', 5300.20, '**** **** **** 2222', 0, 1]);

            db.run(`INSERT INTO users (name, email, password, balance, card_number, card_frozen, biometrics_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, ['Sarah L.', 'sarah@novapay.co', 'sarah123', 940.00, '**** **** **** 3333', 0, 1]);

            // Seed transactions for Alex Mercer
            db.run(`INSERT INTO transactions (user_id, party, amount, type, timestamp) VALUES (?, ?, ?, ?, datetime('now', '-18 hours'))`,
                [alexId, 'Corporate HR', 3400.00, 'Salary Credit']);

            db.run(`INSERT INTO transactions (user_id, party, amount, type, timestamp) VALUES (?, ?, ?, ?, datetime('now', '-1 day'))`,
                [alexId, 'Entertainment (Netflix)', -14.99, 'Subscription']);

            db.run(`INSERT INTO transactions (user_id, party, amount, type, timestamp) VALUES (?, ?, ?, ?, datetime('now', '-2 days'))`,
                [alexId, 'Grocery Outlets', -74.20, 'Card Purchase']);

            db.run(`INSERT INTO transactions (user_id, party, amount, type, timestamp) VALUES (?, ?, ?, ?, datetime('now', '-3 days'))`,
                [alexId, 'Refund Received', 150.00, 'Refund']);

            // Seed pending bills for Alex Mercer
            db.run(`INSERT INTO bills (user_id, company, amount, paid, icon) VALUES (?, ?, ?, ?, ?)`,
                [alexId, 'Power Grid Corp', 85.50, 0, 'lightbulb']);
            db.run(`INSERT INTO bills (user_id, company, amount, paid, icon) VALUES (?, ?, ?, ?, ?)`,
                [alexId, 'City Water Supply', 32.00, 0, 'droplet']);
            db.run(`INSERT INTO bills (user_id, company, amount, paid, icon) VALUES (?, ?, ?, ?, ?)`,
                [alexId, 'Infinity Telecom', 60.00, 0, 'wifi']);

            console.log('Seeding complete.');
        }
    );
}

module.exports = {
    db,
    // Helper methods to wrap callbacks into promises
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};
