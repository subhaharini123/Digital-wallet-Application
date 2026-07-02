const express = require('express');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const dbHelper = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;

// Setup Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieSession({
    name: 'novapay_session',
    keys: ['novapay_super_secret_cipher_key'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Serve Static Files
app.use(express.static(path.join(__dirname)));

// Helper function to hash passwords
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Authentication Check Middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(410).json({ error: 'Session expired or user unauthorized.' });
    }
    next();
}

// 1. API: Register
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All registration parameters are required.' });
    }

    try {
        const existing = await dbHelper.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing) {
            return res.status(400).json({ error: 'Email has already been registered.' });
        }

        const hashedPassword = hashPassword(password);
        const mockCardNum = `**** **** **** ${Math.floor(1000 + Math.random() * 9000)}`;
        const startingBalance = 10000.00; // Gift starting balance of $10,000 for simulator engagement!

        const result = await dbHelper.run(
            `INSERT INTO users (name, email, password, balance, card_number, card_frozen, biometrics_active) 
       VALUES (?, ?, ?, ?, ?, 0, 1)`,
            [name, email.toLowerCase(), hashedPassword, startingBalance, mockCardNum]
        );

        const userId = result.lastID;

        // Automatically seed bills for the new user so they have active mockups to pay!
        await dbHelper.run(`INSERT INTO bills (user_id, company, amount, paid, icon) VALUES (?, 'Power Grid Corp', 85.50, 0, 'lightbulb')`, [userId]);
        await dbHelper.run(`INSERT INTO bills (user_id, company, amount, paid, icon) VALUES (?, 'City Water Supply', 32.00, 0, 'droplet')`, [userId]);
        await dbHelper.run(`INSERT INTO bills (user_id, company, amount, paid, icon) VALUES (?, 'Infinity Telecom', 60.00, 0, 'wifi')`, [userId]);

        // Set Session
        req.session.userId = userId;

        res.status(200).json({ message: 'Registration successful', userId });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Internal server error occurred.' });
    }
});

// 2. API: Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password credentials are required.' });
    }

    try {
        const user = await dbHelper.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user) {
            return res.status(400).json({ error: 'Incorrect email or password.' });
        }

        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword && password !== user.password) { // Support plain text seeds comparison too
            return res.status(400).json({ error: 'Incorrect email or password.' });
        }

        req.session.userId = user.id;
        res.status(200).json({ message: 'Login successful', userId: user.id });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// 3. API: Logout
app.post('/api/logout', (req, res) => {
    req.session = null;
    res.status(200).json({ message: 'Logged out successfully.' });
});

// 4. API: Get Profile Information
app.get('/api/user', requireAuth, async (req, res) => {
    try {
        const user = await dbHelper.get(
            'SELECT id, name, email, balance, card_number, card_frozen, biometrics_active FROM users WHERE id = ?',
            [req.session.userId]
        );
        if (!user) {
            return res.status(404).json({ error: 'User profiles not found.' });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error('Get User Error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// 5. API: Get Transactions Ledger
app.get('/api/transactions', requireAuth, async (req, res) => {
    try {
        const rows = await dbHelper.all(
            'SELECT id, party, amount, type, timestamp FROM transactions WHERE user_id = ? ORDER BY id DESC',
            [req.session.userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error('Get Transactions Error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// 6. API: Get Outstanding Invoices
app.get('/api/bills', requireAuth, async (req, res) => {
    try {
        const rows = await dbHelper.all(
            'SELECT id, company, amount, paid, icon FROM bills WHERE user_id = ? ORDER BY paid ASC, id DESC',
            [req.session.userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error('Get Bills Error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// 7. API: Wire / Transfer Money
app.post('/api/transfer', requireAuth, async (req, res) => {
    let { recipient, amount } = req.body;
    amount = parseFloat(amount);

    if (!recipient || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid recipient details or transaction amount.' });
    }

    const senderId = req.session.userId;

    try {
        const sender = await dbHelper.get('SELECT balance, card_frozen FROM users WHERE id = ?', [senderId]);
        if (!sender) {
            return res.status(400).json({ error: 'Authorized sender accounts not found.' });
        }

        if (sender.card_frozen) {
            return res.status(400).json({ error: 'Transaction rejected. Your debit card is currently frozen.' });
        }

        if (sender.balance < amount) {
            return res.status(400).json({ error: 'Transaction rejected. Insufficient card funds.' });
        }

        // Attempt recipient peer check: by email or name match
        const receiver = await dbHelper.get(
            'SELECT id, name FROM users WHERE email = ? OR name = ?',
            [recipient.toLowerCase(), recipient]
        );

        // SQL transaction wrapper simulation (sequential executions)
        // Deduct from sender
        await dbHelper.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, senderId]);

        // Log sender transaction
        await dbHelper.run(
            'INSERT INTO transactions (user_id, party, amount, type) VALUES (?, ?, ?, ?)',
            [senderId, receiver ? receiver.name : recipient, -amount, 'Money Transfer']
        );

        if (receiver) {
            // Add balance to recipient
            await dbHelper.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, receiver.id]);

            // Log receiver transaction
            await dbHelper.run(
                'INSERT INTO transactions (user_id, party, amount, type) VALUES (?, ?, ?, ?)',
                [receiver.id, sender.name || 'NovaPay User', amount, 'Transfer Credit']
            );
        }

        res.status(200).json({ message: 'Money transfer completed successfully.', newBalance: (sender.balance - amount) });
    } catch (err) {
        console.error('Transfer Error:', err);
        res.status(500).json({ error: 'Internal transaction error occurred.' });
    }
});

// 8. API: Pay Unpaid Bill
app.post('/api/bills/pay', requireAuth, async (req, res) => {
    const { billId } = req.body;

    if (!billId) {
        return res.status(400).json({ error: 'Invoice parameter not specified.' });
    }

    const userId = req.session.userId;

    try {
        const bill = await dbHelper.get('SELECT * FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);
        if (!bill) {
            return res.status(400).json({ error: 'Selected invoice record was not found.' });
        }

        if (bill.paid) {
            return res.status(400).json({ error: 'This invoice has already been settled.' });
        }

        const user = await dbHelper.get('SELECT balance, card_frozen FROM users WHERE id = ?', [userId]);

        if (user.card_frozen) {
            return res.status(400).json({ error: 'Transaction rejected. Your debit card is currently frozen.' });
        }

        if (user.balance < bill.amount) {
            return res.status(400).json({ error: 'Insufficient funds in account to pay this bill.' });
        }

        // Settle bill
        await dbHelper.run('UPDATE users SET balance = balance - ? WHERE id = ?', [bill.amount, userId]);
        await dbHelper.run('UPDATE bills SET paid = 1 WHERE id = ?', [billId]);
        await dbHelper.run(
            'INSERT INTO transactions (user_id, party, amount, type) VALUES (?, ?, ?, ?)',
            [userId, bill.company, -bill.amount, 'Bill Payment']
        );

        res.status(200).json({ message: `Bill paid successfully to ${bill.company}`, newBalance: (user.balance - bill.amount) });
    } catch (err) {
        console.error('Bill Pay Error:', err);
        res.status(500).json({ error: 'Internal transaction error.' });
    }
});

// 9. API: Update Settings Settings
app.post('/api/security/toggle', requireAuth, async (req, res) => {
    const { type, value } = req.body; // type: 'biometrics' or 'freeze', value: 0 or 1

    if (!['biometrics', 'freeze'].includes(type) || ![0, 1].includes(value)) {
        return res.status(400).json({ error: 'Invalid configuration parameters.' });
    }

    const userId = req.session.userId;
    const dbColumn = type === 'biometrics' ? 'biometrics_active' : 'card_frozen';

    try {
        await dbHelper.run(`UPDATE users SET ${dbColumn} = ? WHERE id = ?`, [value, userId]);
        res.status(200).json({ message: `Setting ${type} updated successfully.` });
    } catch (err) {
        console.error('Security Switch Error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`NovaPay Server actively listening on: http://localhost:${PORT}`);
});
