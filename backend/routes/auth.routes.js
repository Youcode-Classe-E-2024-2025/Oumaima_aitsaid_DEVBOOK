// Routes pour l'authentification
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = global.db; 
 // Chemin adapté à ta structure
require('dotenv').config();

// Inscription d'un nouvel utilisateur (étudiant par défaut)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  // Validation simple
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }
  
  try {
    // Vérifier si l'email existe déjà
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Rôle étudiant par défaut (id = 2)
    const roleId = 2;
    
    // Insérer le nouvel utilisateur
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, roleId]
    );
    
    // Créer un token JWT
    const token = jwt.sign(
      { id: result.insertId, email, role: 'student', name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role: 'student'
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Connexion d'un utilisateur
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Validation simple
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe obligatoires' });
  }
  
  try {
    // Récupérer l'utilisateur par email
    const [users] = await db.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    const user = users[0];
    
    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    // Créer un token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Vérifier le token actuel
router.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Aucun token fourni' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    });
  } catch (error) {
    res.json({ valid: false });
  }
});

module.exports = router;