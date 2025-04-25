// Serveur principal de l'application DevBook
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();
const dbConfig = require('./db/db.config');

// Routes
const authRoutes = require('./routes/auth.routes');
const bookRoutes = require('./routes/book.routes');
const categoryRoutes = require('./routes/category.routes');
const borrowRoutes = require('./routes/borrow.routes');
const userRoutes = require('./routes/user.routes');
const db = require('./db/db');

db.query('SELECT 1')
  .then(() => console.log('✅ Connexion MySQL OK'))
  .catch((err) => console.error('❌ Erreur de connexion MySQL', err));
// Options CORS plus permissives
// Créer l'application Express
global.db = db;
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permettre les requêtes cross-origin
app.use(express.json()); // Parser le corps des requêtes en JSON
app.use(express.urlencoded({ extended: true }));


// Connexion à la base de données
let connection;

async function initDB() {
  try {
    // Créer une connection pool  
    connection = await mysql.createPool(dbConfig);
    console.log('Connexion à la base de données MySQL établie');
    global.db = connection; // Rendre la connexion disponible globalement
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);  
    process.exit(1);
  }  
}  
// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/users', userRoutes);

// Servir les fichiers statiques (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Route racine - renvoie le frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Démarrer le serveur
async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
    console.log(`Accédez à l'application: http://localhost:${PORT}`);
  });
}

startServer();