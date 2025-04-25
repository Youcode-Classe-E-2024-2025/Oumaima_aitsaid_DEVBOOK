// Routes pour la gestion des utilisateurs
const express = require('express');
const router = express.Router();
const db = global.db;
const bcrypt = require('bcrypt');
const authMiddleware = require('../middleware/auth.middleware');

// Obtenir tous les utilisateurs - accessible aux administrateurs
router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, u.created_at, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.name
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir un utilisateur par ID - accessible à l'utilisateur lui-même ou un admin
router.get('/:id', authMiddleware.verifyToken, async (req, res) => {
  // Vérifier si l'utilisateur est autorisé
  if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Non autorisé' });
  }
  
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, u.created_at, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un utilisateur - accessible à l'utilisateur lui-même ou un admin
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  // Vérifier si l'utilisateur est autorisé
  if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Non autorisé' });
  }
  
  const { name, email, password, role_id } = req.body;
  const userId = req.params.id;
  
  try {
    // Vérifier si l'utilisateur existe
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Préparer les mises à jour
    let updates = [];
    let values = [];
    
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    
    if (email) {
      // Vérifier si l'email est déjà utilisé par un autre utilisateur
      const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ? AND id != ?', [email, userId]);
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      
      updates.push('email = ?');
      values.push(email);
    }
    
    if (password) {
      // Hacher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    
    // Seul un admin peut changer le rôle
    if (role_id && req.user.role === 'admin') {
      updates.push('role_id = ?');
      values.push(role_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }
    
    // Ajouter l'ID utilisateur aux valeurs
    values.push(userId);
    
    // Exécuter la mise à jour
    await db.query(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);
    
    // Récupérer l'utilisateur mis à jour
    const [updatedUser] = await db.query(`
      SELECT u.id, u.name, u.email, u.created_at, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un utilisateur - accessible uniquement aux administrateurs
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  try {
    // Vérifier si l'utilisateur existe
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Empêcher la suppression de soi-même
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    
    // Supprimer l'utilisateur
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Utilisateur supprimé avec succès', id: parseInt(req.params.id) });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les emprunts d'un utilisateur - accessible à l'utilisateur lui-même ou un admin
router.get('/:id/borrows', authMiddleware.verifyToken, async (req, res) => {
  // Vérifier si l'utilisateur est autorisé
  if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Non autorisé' });
  }
  
  try {
    const [rows] = await db.query(`
      SELECT br.*, 
        b.title as book_title, 
        b.author as book_author,
        DATEDIFF(CURRENT_DATE, br.expected_return_date) AS days_overdue
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      WHERE br.user_id = ?
      ORDER BY br.borrow_date DESC
    `, [req.params.id]);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des emprunts de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;