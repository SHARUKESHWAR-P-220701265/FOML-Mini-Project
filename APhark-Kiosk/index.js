const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = 'aphark.db';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite DB
const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) throw err;
  // Medicines table
  db.run(`CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    condition TEXT,
    price INTEGER
  )`);
  // Cart table with UNIQUE constraint
  db.run(`CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER UNIQUE,
    quantity INTEGER,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
  )`);
  // Merge duplicate cart rows if any (legacy fix)
  db.all('SELECT medicine_id, SUM(quantity) as total FROM cart GROUP BY medicine_id HAVING COUNT(*) > 1', (err, rows) => {
    if (!err && rows && rows.length > 0) {
      rows.forEach(row => {
        db.run('DELETE FROM cart WHERE medicine_id = ?', [row.medicine_id]);
        db.run('INSERT INTO cart (medicine_id, quantity) VALUES (?, ?)', [row.medicine_id, row.total]);
      });
    }
  });
  // Seed medicines if empty
  db.get('SELECT COUNT(*) as count FROM medicines', (err, row) => {
    if (!err && row && row.count === 0) {
      const meds = [
        ['Aspirin', 'Pain relief', 10],
        ['Metformin', 'Diabetes', 20],
        ['Atorvastatin', 'Cholesterol', 25],
        ['Lisinopril', 'Blood pressure', 15],
        ['Amoxicillin', 'Antibiotic', 12],
        ['Omeprazole', 'Acid reflux', 18],
        ['Albuterol', 'Asthma', 22],
        ['Warfarin', 'Blood thinner', 30],
        ['Levothyroxine', 'Thyroid', 16],
        ['Paracetamol', 'Fever', 8]
      ];
      meds.forEach(([name, condition, price]) => {
        db.run('INSERT INTO medicines (name, condition, price) VALUES (?, ?, ?)', [name, condition, price]);
      });
    }
  });
});

// API: Get all medicines
app.get('/api/medicines', (req, res) => {
  db.all('SELECT * FROM medicines', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Get cart
app.get('/api/cart', (req, res) => {
  db.all(`SELECT cart.id, medicines.id as medicine_id, medicines.name, medicines.condition, medicines.price, cart.quantity
          FROM cart JOIN medicines ON cart.medicine_id = medicines.id`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Add/increment medicine in cart
app.post('/api/cart', (req, res) => {
  const { id } = req.body;
  db.get('SELECT * FROM cart WHERE medicine_id = ?', [id], (err, row) => {
    if (row) {
      db.run('UPDATE cart SET quantity = quantity + 1 WHERE medicine_id = ?', [id], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        returnCart(res);
      });
    } else {
      db.run('INSERT INTO cart (medicine_id, quantity) VALUES (?, 1)', [id], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        returnCart(res);
      });
    }
  });
});

// API: Increment quantity
app.post('/api/cart/increment', (req, res) => {
  const { id } = req.body;
  db.run('UPDATE cart SET quantity = quantity + 1 WHERE medicine_id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    returnCart(res);
  });
});

// API: Decrement quantity
app.post('/api/cart/decrement', (req, res) => {
  const { id } = req.body;
  db.get('SELECT quantity FROM cart WHERE medicine_id = ?', [id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not in cart' });
    if (row.quantity > 1) {
      db.run('UPDATE cart SET quantity = quantity - 1 WHERE medicine_id = ?', [id], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        returnCart(res);
      });
    } else {
      db.run('DELETE FROM cart WHERE medicine_id = ?', [id], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        returnCart(res);
      });
    }
  });
});

// API: Remove from cart
app.post('/api/cart/remove', (req, res) => {
  const { id } = req.body;
  db.run('DELETE FROM cart WHERE medicine_id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    returnCart(res);
  });
});

// API: Place pseudo purchase
app.post('/api/purchase', (req, res) => {
  db.all(`SELECT cart.id, medicines.name, medicines.price, cart.quantity
          FROM cart JOIN medicines ON cart.medicine_id = medicines.id`, (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
    const total = items.reduce((sum, m) => sum + m.price * m.quantity, 0);
    db.run('DELETE FROM cart', [], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, purchase: { items, total } });
    });
  });
});

function returnCart(res) {
  db.all(`SELECT cart.id, medicines.id as medicine_id, medicines.name, medicines.condition, medicines.price, cart.quantity
          FROM cart JOIN medicines ON cart.medicine_id = medicines.id`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

console.log('Starting APhark-Kiosk server...');
app.listen(PORT, () => {
  console.log(`APhark-Kiosk server running on http://localhost:${PORT}`);
}); 