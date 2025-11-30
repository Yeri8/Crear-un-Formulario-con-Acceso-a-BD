// server-sqlite.js (reemplazar entero por este)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Optional: usa el paquete cors (recomendado)
const cors = require('cors');

const DB_FILE = path.join(__dirname, 'data.sqlite');

// FRONTEND_DIR resolución flexible:
//  - si se define FRONTEND_DIR en env (ej. Render), se usa
//  - si no, se prueban rutas relativas comunes
const FRONTEND_DIR = process.env.FRONTEND_DIR
  || path.join(__dirname, '..', '..', 'frontend')   // estructura repo local
  || path.join(__dirname, '..', 'frontend');

const app = express();

// Habilitar CORS de forma abierta (para pruebas / GitHub Pages / Render).
// En producción limitar origin a la(s) URL(s) permitida(s).
app.use(cors());
// Si prefieres no instalar cors, puedes usar el middleware manual siguiente:
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
//   if (req.method === 'OPTIONS') return res.sendStatus(204);
//   next();
// });

app.use(express.json());

// --- Inicializar DB SQLite ---
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
  )`, (err) => {
    if (err) console.error('Error creando tabla people:', err);
  });
});

// ---- RUTAS API ----
function rowToObj(row){
  if(!row) return null;
  return { id: row.id, name: row.name, email: row.email, age: row.age, notes: row.notes };
}

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

// --- SERVIR FRONTEND (si existe) ---
function folderExists(p){ try { return fs.statSync(p).isDirectory(); } catch(e){ return false; } }

if (folderExists(FRONTEND_DIR)) {
  console.log('Sirviendo frontend desde:', FRONTEND_DIR);
  app.use(express.static(FRONTEND_DIR));
  // En caso de rutas SPA
  app.get('*', (req, res) => {
    const indexPath = path.join(FRONTEND_DIR, 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    // si no hay index.html, devolvemos un JSON informativo
    res.status(404).send('Index no encontrado en el frontend');
  });
} else {
  console.warn(`Frontend no encontrado en ${FRONTEND_DIR}. Rutas API siguen activas.`);
  // Rutas básicas para la raíz, evitan ENOENT en deploy
  app.get('/', (req, res) => {
    res.send(`<h2>API backend ejecutando</h2>
      <p>No se encontró la carpeta frontend en: <code>${FRONTEND_DIR}</code></p>
      <p>API: <a href="/api/people">/api/people</a></p>`);
  });
}

// --- arrancar servidor ---
const port = parseInt(process.env.PORT, 10) || 3000;
app.listen(port, () => {
  console.log('Server (SQLite) listening on', port);
});
