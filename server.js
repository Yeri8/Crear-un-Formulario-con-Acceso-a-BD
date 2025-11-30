// server.js  (reemplaza TODO el contenido por esto)
const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// ---------- find frontend directory robustly ----------
function findFrontendDir() {
  // Try relative locations up to 4 levels up
  let p = __dirname;
  for (let i = 0; i < 5; i++) {
    const cand = path.join(p, 'frontend', 'index.html');
    if (fs.existsSync(cand)) return path.join(p, 'frontend');
    p = path.join(p, '..');
  }
  // fallback: check repo root /frontend (another attempt)
  const alt = path.join(process.cwd(), 'frontend');
  if (fs.existsSync(path.join(alt, 'index.html'))) return alt;
  // last resort: current dir if index.html exists here
  if (fs.existsSync(path.join(__dirname, 'index.html'))) return __dirname;
  return null;
}

const frontendDir = findFrontendDir();
if (frontendDir) {
  console.log('Serving frontend from:', frontendDir);
  app.use(express.static(frontendDir));
} else {
  console.warn('Frontend folder not found by server. Static files will not be served.');
}

// ---------- SQLite DB (file in same directory as server or in data dir) ----------
const DB_FILE = path.join(__dirname, 'data.sqlite');

// create/open DB
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Cannot open database', err);
    process.exit(1);
  }
});

// ensure table
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

function rowToObj(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, age: row.age, notes: row.notes };
}

// ---------- API endpoints ----------
app.get('/api/people', (req, res) => {
  db.all('SELECT id,name,email,age,notes FROM people ORDER BY id DESC LIMIT 1000', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows.map(rowToObj));
  });
});

app.get('/api/people/:id', (req, res) => {
  db.get('SELECT id,name,email,age,notes FROM people WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(rowToObj(row));
  });
});

app.post('/api/people', (req, res) => {
  const { name, email, age, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const stmt = db.prepare('INSERT INTO people (name,email,age,notes) VALUES (?,?,?,?)');
  stmt.run(name, email || null, age || null, notes || null, function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    const id = this.lastID;
    db.get('SELECT id,name,email,age,notes FROM people WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: 'db error' });
      res.status(201).json(rowToObj(row));
    });
  });
});

app.put('/api/people/:id', (req, res) => {
  const { name, email, age, notes } = req.body || {};
  db.run('UPDATE people SET name=?, email=?, age=?, notes=? WHERE id=?', [name, email||null, age||null, notes||null, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    if (this.changes === 0) return res.status(404).json({ error: 'not found' });
    db.get('SELECT id,name,email,age,notes FROM people WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: 'db error' });
      res.json(rowToObj(row));
    });
  });
});

app.delete('/api/people/:id', (req, res) => {
  db.run('DELETE FROM people WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ ok: true });
  });
});

// If frontend exists, serve index.html for unknown routes (SPA fallback)
if (frontendDir) {
  app.get('*', (req, res) => {
    const f = path.join(frontendDir, 'index.html');
    if (fs.existsSync(f)) return res.sendFile(f);
    res.status(404).send('Not found');
  });
} else {
  app.get('*', (req, res) => {
    res.status(404).send('No frontend available on this server.');
  });
}

// ---------- start ----------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server (SQLite) listening on ${port}`);
});
