// backend/sqlite/server-sqlite.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'data.sqlite');
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

const app = express();
app.use(express.json());

// Inicializar DB
if (!fs.existsSync(DB_FILE)) {
  console.log('DB no existe. Se creará en:', DB_FILE);
}
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('No se pudo abrir la base de datos:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    age INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Helper
function rowToObj(row){
  if(!row) return null;
  return { id: row.id, name: row.name, email: row.email, age: row.age, notes: row.notes };
}

// --- RUTAS API ---
app.post('/api/people', (req, res) => {
  const { name, email, age, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const stmt = db.prepare('INSERT INTO people (name,email,age,notes) VALUES (?,?,?,?)');
  stmt.run(name, email || null, age || null, notes || null, function(err) {
    if (err) {
      console.error('INSERT error', err);
      return res.status(500).json({ error: 'db error' });
    }
    const id = this.lastID;
    db.get('SELECT id,name,email,age,notes FROM people WHERE id = ?', [id], (err, row) => {
      if (err) { console.error('SELECT after insert', err); return res.status(500).json({ error: 'db error' }); }
      res.status(201).json(rowToObj(row));
    });
  });
});

app.get('/api/people', (req, res) => {
  db.all('SELECT id,name,email,age,notes FROM people ORDER BY id DESC LIMIT 1000', [], (err, rows) => {
    if (err) { console.error('SELECT all', err); return res.status(500).json({ error: 'db error' }); }
    res.json(rows.map(rowToObj));
  });
});

app.get('/api/people/:id', (req, res) => {
  db.get('SELECT id,name,email,age,notes FROM people WHERE id = ?', [req.params.id], (err, row) => {
    if (err) { console.error('SELECT id', err); return res.status(500).json({ error: 'db error' }); }
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(rowToObj(row));
  });
});

app.put('/api/people/:id', (req, res) => {
  const { name, email, age, notes } = req.body || {};
  db.run('UPDATE people SET name=?, email=?, age=?, notes=? WHERE id=?', [name, email||null, age||null, notes||null, req.params.id], function(err) {
    if (err) { console.error('UPDATE', err); return res.status(500).json({ error: 'db error' }); }
    if (this.changes === 0) return res.status(404).json({ error: 'not found' });
    db.get('SELECT id,name,email,age,notes FROM people WHERE id = ?', [req.params.id], (err, row) => {
      if (err) { console.error('SELECT after update', err); return res.status(500).json({ error: 'db error' }); }
      res.json(rowToObj(row));
    });
  });
});

app.delete('/api/people/:id', (req, res) => {
  db.run('DELETE FROM people WHERE id = ?', [req.params.id], function(err) {
    if (err) { console.error('DELETE', err); return res.status(500).json({ error: 'db error' }); }
    res.json({ ok: true, deleted: this.changes });
  });
});

// --- SERVIR FRONTEND (al final) ---
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// --- arrancar servidor ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server (SQLite) listening on', port);
});
