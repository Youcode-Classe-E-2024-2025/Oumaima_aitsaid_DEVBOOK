// Routes pour la gestion des emprunts
const express = require('express');
const router = express.Router();
const db = global.db;
const authMiddleware = require('../middleware/auth.middleware');

// Obtenir tous les emprunts - accessible aux administrateurs
router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, 
        b.title as book_title, 
        u.name as user_name,
        DATEDIFF(CURRENT_DATE, br.expected_return_date) AS days_overdue
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      JOIN users u ON br.user_id = u.id
      ORDER BY br.borrow_date DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des emprunts:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les emprunts de l'utilisateur connecté - accessible aux étudiants
router.get('/my', authMiddleware.verifyToken, async (req, res) => {
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
    `, [req.user.id]);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération de mes emprunts:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les emprunts en retard - accessible aux administrateurs
router.get('/overdue', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, 
        b.title as book_title, 
        u.name as user_name,
        DATEDIFF(CURRENT_DATE, br.expected_return_date) AS days_overdue
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      JOIN users u ON br.user_id = u.id
      WHERE br.return_date IS NULL AND br.expected_return_date < CURRENT_DATE
      ORDER BY days_overdue DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des emprunts en retard:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouvel emprunt - accessible à tous les utilisateurs authentifiés
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  const { book_id } = req.body;
  const user_id = req.user.id;
  
  if (!book_id) {
    return res.status(400).json({ message: 'ID du livre obligatoire' });
  }
  
  try {
    // Vérifier si le livre est disponible (non emprunté)
    const [activeLoans] = await db.query(`
      SELECT * FROM borrows 
      WHERE book_id = ? AND return_date IS NULL
    `, [book_id]);
    
    if (activeLoans.length > 0) {
      return res.status(400).json({ message: 'Ce livre est déjà emprunté' });
    }
    
    // Calculer la date d'échéance (14 jours après aujourd'hui)
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 14);
    
    // Formater les dates pour MySQL
    const borrowDate = today.toISOString().split('T')[0];
    const expectedReturnDate = dueDate.toISOString().split('T')[0];
    
    // Créer l'emprunt
    const [result] = await db.query(`
      INSERT INTO borrows (book_id, user_id, borrow_date, expected_return_date)
      VALUES (?, ?, ?, ?)
    `, [book_id, user_id, borrowDate, expectedReturnDate]);
    
    // Récupérer l'emprunt créé
    const [newBorrow] = await db.query(`
      SELECT br.*, b.title as book_title
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      WHERE br.id = ?
    `, [result.insertId]);
    
    res.status(201).json(newBorrow[0]);
  } catch (error) {
    console.error('Erreur lors de la création de l\'emprunt:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Marquer un livre comme rendu - accessible à tous les utilisateurs authentifiés
router.put('/:id/return', authMiddleware.verifyToken, async (req, res) => {
  const borrowId = req.params.id;
  
  try {
    // Vérifier que l'emprunt existe et n'est pas déjà rendu
    const [borrows] = await db.query(`
      SELECT * FROM borrows WHERE id = ?
    `, [borrowId]);
    
    if (borrows.length === 0) {
      return res.status(404).json({ message: 'Emprunt non trouvé' });
    }
    
    const borrow = borrows[0];
    
    // Vérifier que l'utilisateur est autorisé (c'est son emprunt ou c'est un admin)
    if (borrow.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    if (borrow.return_date) {
      return res.status(400).json({ message: 'Ce livre a déjà été rendu' });
    }
    
    // Mettre à jour la date de retour
    const today = new Date().toISOString().split('T')[0];
    
    await db.query(`
      UPDATE borrows SET return_date = ? WHERE id = ?
    `, [today, borrowId]);
    
    // Récupérer l'emprunt mis à jour
    const [updatedBorrow] = await db.query(`
      SELECT br.*, b.title as book_title
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      WHERE br.id = ?
    `, [borrowId]);
    
    res.json(updatedBorrow[0]);
  } catch (error) {
    console.error('Erreur lors du retour du livre:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir des statistiques sur les emprunts - accessible aux administrateurs
router.get('/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  try {
    // Nombre total d'emprunts
    const [totalCount] = await db.query('SELECT COUNT(*) as total FROM borrows');
    
    // Nombre d'emprunts actifs
    const [activeCount] = await db.query('SELECT COUNT(*) as active FROM borrows WHERE return_date IS NULL');
    
    // Nombre d'emprunts en retard
    const [overdueCount] = await db.query(`
      SELECT COUNT(*) as overdue 
      FROM borrows 
      WHERE return_date IS NULL AND expected_return_date < CURRENT_DATE
    `);
    
    // Livres les plus empruntés
    const [topBooks] = await db.query(`
      SELECT b.id, b.title, COUNT(br.id) as borrow_count
      FROM books b
      JOIN borrows br ON b.id = br.book_id
      GROUP BY b.id, b.title
      ORDER BY borrow_count DESC
      LIMIT 5
    `);
    
    res.json({
      total: totalCount[0].total,
      active: activeCount[0].active,
      overdue: overdueCount[0].overdue,
      topBooks
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les emprunts pour une date spécifique - accessible aux administrateurs
router.get('/date/:date', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  const date = req.params.date;
  
  // Validation de la date (format YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'Format de date invalide. Utilisez YYYY-MM-DD' });
  }
  
  try {
    const [rows] = await db.query(`
      SELECT br.*, 
        b.title as book_title, 
        u.name as user_name
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      JOIN users u ON br.user_id = u.id
      WHERE br.borrow_date = ?
    `, [date]);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des emprunts par date:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir le top des livres empruntés pour un mois spécifique - accessible aux administrateurs
router.get('/top/:year/:month', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);
  
  // Validation de l'année et du mois
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Année ou mois invalide' });
  }
  
  try {
    const [rows] = await db.query(`
      SELECT 
        b.id,
        b.title,
        b.author,
        COUNT(br.id) AS borrow_count
      FROM 
        books b
      JOIN 
        borrows br ON b.id = br.book_id
      WHERE 
        YEAR(br.borrow_date) = ? AND MONTH(br.borrow_date) = ?
      GROUP BY 
        b.id, b.title, b.author
      ORDER BY 
        borrow_count DESC
      LIMIT 10
    `, [year, month]);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des livres les plus empruntés:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;