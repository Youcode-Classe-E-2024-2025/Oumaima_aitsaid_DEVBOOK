// Routes pour la gestion des livres
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Obtenir tous les livres - accessible à tous
router.get('/', bookController.getAllBooks);

// Rechercher des livres - accessible à tous
router.get('/search', bookController.searchBooks);

// Obtenir les livres par statut - accessible à tous
router.get('/status/:status', bookController.getBooksByStatus);

// Obtenir un livre par ID - accessible à tous
router.get('/:id', bookController.getBookById);

// Créer un nouveau livre - accessible aux administrateurs
router.post('/', authMiddleware.verifyToken, authMiddleware.isAdmin, bookController.createBook);

// Mettre à jour un livre - accessible aux administrateurs
router.put('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, bookController.updateBook);

// Supprimer un livre - accessible aux administrateurs
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, bookController.deleteBook);

module.exports = router;