// Contrôleur pour la gestion des livres
const db = global.db;

// Obtenir tous les livres
exports.getAllBooks = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.title
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des livres:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Obtenir un livre par ID
exports.getBookById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du livre:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un nouveau livre
exports.createBook = async (req, res) => {
  const { title, author, category_id, status, rating, description } = req.body;
  
  // Validation simple
  if (!title || !author) {
    return res.status(400).json({ message: 'Le titre et l\'auteur sont obligatoires' });
  }
  
  try {
    const [result] = await db.query(`
      INSERT INTO books (title, author, category_id, status, rating, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, author, category_id, status || 'to_read', rating || 0, description || '']);
    
    const [newBook] = await db.query('SELECT * FROM books WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newBook[0]);
  } catch (error) {
    console.error('Erreur lors de la création du livre:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour un livre
exports.updateBook = async (req, res) => {
  const { title, author, category_id, status, rating, description } = req.body;
  const bookId = req.params.id;
  
  // Validation simple
  if (!title || !author) {
    return res.status(400).json({ message: 'Le titre et l\'auteur sont obligatoires' });
  }
  
  try {
    const [result] = await db.query(`
      UPDATE books
      SET title = ?, author = ?, category_id = ?, status = ?, rating = ?, description = ?
      WHERE id = ?
    `, [title, author, category_id, status, rating, description, bookId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    
    const [updatedBook] = await db.query('SELECT * FROM books WHERE id = ?', [bookId]);
    
    res.json(updatedBook[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du livre:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un livre
exports.deleteBook = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    
    res.json({ message: 'Livre supprimé avec succès', id: req.params.id });
  } catch (error) {
    console.error('Erreur lors de la suppression du livre:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Filtrer les livres par statut
exports.getBooksByStatus = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.status = ?
    `, [req.params.status]);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des livres par statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Rechercher des livres
exports.searchBooks = async (req, res) => {
  const searchTerm = req.query.q;
  
  if (!searchTerm) {
    return res.status(400).json({ message: 'Terme de recherche obligatoire' });
  }
  
  try {
    const [rows] = await db.query(`
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE 
        b.title LIKE ? OR 
        b.author LIKE ? OR
        b.description LIKE ?
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
    
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la recherche de livres:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};