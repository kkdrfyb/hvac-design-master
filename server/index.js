const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'hvac-secret-key';

// Middleware to verify JWT
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = username === 'admin' ? 'admin' : 'user';

    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, role], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, username, role });
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
});

app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// Projects routes
app.get('/api/projects', authenticate, (req, res) => {
    const query = req.user.role === 'admin'
        ? `SELECT p.*, u.username as owner FROM projects p JOIN users u ON p.user_id = u.id`
        : `SELECT * FROM projects WHERE user_id = ?`;
    const params = req.user.role === 'admin' ? [] : [req.user.id];

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(row => {
            const { data, ...rest } = row;
            return { ...rest, ...JSON.parse(data || '{}') };
        }));
    });
});

app.post('/api/projects', authenticate, (req, res) => {
    // data is extracted but we also need to ensure it's not nested if sent from frontend
    const { id, name, code, user_id, owner, data: incomingData, ...rest } = req.body;
    const dataString = JSON.stringify(rest);

    db.run(`INSERT OR REPLACE INTO projects (id, user_id, name, code, data) VALUES (?, ?, ?, ?, ?)`,
        [id, req.user.id, name, code, dataString], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, code });
        });
});

app.delete('/api/projects/:id', authenticate, (req, res) => {
    db.run(`DELETE FROM projects WHERE id = ? AND (user_id = ? OR ?)`,
        [req.params.id, req.user.id, req.user.role === 'admin'], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
