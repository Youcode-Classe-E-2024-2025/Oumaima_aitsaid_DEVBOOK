// Routes pour la gestion des catégories
const express = require('express');
const router = express.Router();
const db = global.db;
const authMiddleware = require('../middleware/auth.middleware');

// Obtenir toutes les catégories - accessible à tous
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir une catégorie par ID avec ses livres - accessible à tous
router.get('/:id', async (req, res) => {
  try {
    // Récupérer la catégorie
    const [categoryRows] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    
    if (categoryRows.length === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }
    
    // Récupérer les livres de cette catégorie
    const [bookRows] = await db.query('SELECT * FROM books WHERE category_id = ?', [req.params.id]);
    
    // Renvoyer la catégorie avec ses livres
    res.json({
      ...categoryRows[0],
      books: bookRows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle catégorie - accessible aux administrateurs
router.post('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  const { name, description } = req.body;
  
  // Validation simple
  if (!name) {
    return res.status(400).json({ message: 'Le nom est obligatoire' });
  }
  
  try {
    const [result] = await db.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    
    const [newCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une catégorie - accessible aux administrateurs
router.put('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  const { name, description } = req.body;
  
  // Validation simple
  if (!name) {
    return res.status(400).json({ message: 'Le nom est obligatoire' });
  }
  
  try {
    const [result] = await db.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || '', req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }
    
    const [updatedCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    
    res.json(updatedCategory[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une catégorie - accessible aux administrateurs
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }
    
    res.json({ message: 'Catégorie supprimée avec succès', id: req.params.id });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des catégories - accessible à tous
router.get('/stats/book-count', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.name, COUNT(b.id) as book_count
      FROM categories c
      LEFT JOIN books b ON c.id = b.category_id
      GROUP BY c.id, c.name
      ORDER BY book_count DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;