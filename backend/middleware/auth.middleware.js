// Middleware d'authentification
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Vérifier si l'utilisateur est authentifié (token valide)
exports.verifyToken = (req, res, next) => {
  // Récupérer le token d'authentification de l'en-tête
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ message: 'Authentification requise' });
  }
  
  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Stocker les infos utilisateur décodées
    next(); // Passer au gestionnaire suivant
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    return res.status(403).json({ message: 'Token invalide' });
  }
};

// Vérifier si l'utilisateur est un administrateur
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }
  
  next();
};

// Vérifier si l'utilisateur est un étudiant
exports.isStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }
  
  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux étudiants' });
  }
  
  next();
};

// Vérifier si l'utilisateur est le propriétaire de la ressource ou un admin
exports.isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }
  
  // Si l'utilisateur est un admin, autoriser l'accès
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Sinon, vérifier si l'utilisateur est le propriétaire
  const resourceUserId = parseInt(req.params.userId || req.body.userId);
  
  if (req.user.id !== resourceUserId) {
    return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à accéder à cette ressource' });
  }
  
  next();
};