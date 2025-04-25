/**
 * Service d'API pour communiquer avec le backend
 */
class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        this.headers = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Configure le token d'authentification
     * @param {string} token - Token JWT
     */
    setAuthToken(token) {
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.headers['Authorization'];
        }
    }

    /**
     * Effectue une requête HTTP
     * @param {string} url - URL de la requête
     * @param {string} method - Méthode HTTP (GET, POST, PUT, DELETE)
     * @param {Object} data - Données à envoyer
     * @returns {Promise<any>} - Réponse de l'API
     */
    async request(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: this.headers
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}${url}`, options);
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Une erreur est survenue');
            }

            return responseData;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ------------- AUTHENTIFICATION -------------

    /**
     * Connexion utilisateur
     * @param {string} email - Email de l'utilisateur
     * @param {string} password - Mot de passe
     * @returns {Promise<{token: string, user: Object}>} - Token et informations utilisateur
     */
    async login(email, password) {
        return this.request('/auth/login', 'POST', { email, password });
    }

    /**
     * Inscription utilisateur
     * @param {string} name - Nom de l'utilisateur
     * @param {string} email - Email
     * @param {string} password - Mot de passe
     * @returns {Promise<{token: string, user: Object}>} - Token et informations utilisateur
     */
    async register(name, email, password) {
        return this.request('/auth/register', 'POST', { name, email, password });
    }

    /**
     * Vérifie si le token est valide
     * @returns {Promise<{valid: boolean, user: Object}>} - Validité du token et informations utilisateur
     */
    async verifyToken() {
        return this.request('/auth/verify');
    }

    // ------------- LIVRES -------------

    /**
     * Récupère tous les livres
     * @returns {Promise<Array>} - Liste des livres
     */
    async getBooks() {
        return this.request('/books');
    }

    /**
     * Récupère un livre par son ID
     * @param {number} id - ID du livre
     * @returns {Promise<Object>} - Détails du livre
     */
    async getBookById(id) {
        return this.request(`/books/${id}`);
    }

    /**
     * Crée un nouveau livre
     * @param {Object} bookData - Données du livre
     * @returns {Promise<Object>} - Livre créé
     */
    async createBook(bookData) {
        return this.request('/books', 'POST', bookData);
    }

    /**
     * Met à jour un livre
     * @param {number} id - ID du livre
     * @param {Object} bookData - Nouvelles données
     * @returns {Promise<Object>} - Livre mis à jour
     */
    async updateBook(id, bookData) {
        return this.request(`/books/${id}`, 'PUT', bookData);
    }

    /**
     * Supprime un livre
     * @param {number} id - ID du livre
     * @returns {Promise<Object>} - Confirmation de suppression
     */
    async deleteBook(id) {
        return this.request(`/books/${id}`, 'DELETE');
    }

    /**
     * Recherche des livres
     * @param {string} query - Terme de recherche
     * @returns {Promise<Array>} - Résultats de recherche
     */
    async searchBooks(query) {
        return this.request(`/books/search?q=${encodeURIComponent(query)}`);
    }

    /**
     * Filtre les livres par statut
     * @param {string} status - Statut ('to_read', 'reading', 'read')
     * @returns {Promise<Array>} - Livres filtrés
     */
    async getBooksByStatus(status) {
        return this.request(`/books/status/${status}`);
    }

    // ------------- CATÉGORIES -------------

    /**
     * Récupère toutes les catégories
     * @returns {Promise<Array>} - Liste des catégories
     */
    async getCategories() {
        return this.request('/categories');
    }

    /**
     * Récupère une catégorie par son ID
     * @param {number} id - ID de la catégorie
     * @returns {Promise<Object>} - Détails de la catégorie avec ses livres
     */
    async getCategoryById(id) {
        return this.request(`/categories/${id}`);
    }

    /**
     * Crée une nouvelle catégorie
     * @param {Object} categoryData - Données de la catégorie
     * @returns {Promise<Object>} - Catégorie créée
     */
    async createCategory(categoryData) {
        return this.request('/categories', 'POST', categoryData);
    }

    /**
     * Met à jour une catégorie
     * @param {number} id - ID de la catégorie
     * @param {Object} categoryData - Nouvelles données
     * @returns {Promise<Object>} - Catégorie mise à jour
     */
    async updateCategory(id, categoryData) {
        return this.request(`/categories/${id}`, 'PUT', categoryData);
    }

    /**
     * Supprime une catégorie
     * @param {number} id - ID de la catégorie
     * @returns {Promise<Object>} - Confirmation de suppression
     */
    async deleteCategory(id) {
        return this.request(`/categories/${id}`, 'DELETE');
    }

    /**
     * Récupère les statistiques des catégories
     * @returns {Promise<Array>} - Statistiques des catégories
     */
    async getCategoryStats() {
        return this.request('/categories/stats/book-count');
    }

    // ------------- EMPRUNTS -------------

    /**
     * Récupère tous les emprunts (admin)
     * @returns {Promise<Array>} - Liste des emprunts
     */
    async getAllBorrows() {
        return this.request('/borrows');
    }

    /**
     * Récupère les emprunts de l'utilisateur connecté
     * @returns {Promise<Array>} - Liste des emprunts
     */
    async getMyBorrows() {
        return this.request('/borrows/my');
    }

    /**
     * Récupère les emprunts en retard (admin)
     * @returns {Promise<Array>} - Liste des emprunts en retard
     */
    async getOverdueBorrows() {
        return this.request('/borrows/overdue');
    }

    /**
     * Crée un nouvel emprunt
     * @param {number} bookId - ID du livre
     * @returns {Promise<Object>} - Emprunt créé
     */
    async createBorrow(bookId) {
        return this.request('/borrows', 'POST', { book_id: bookId });
    }

    /**
     * Marque un livre comme rendu
     * @param {number} borrowId - ID de l'emprunt
     * @returns {Promise<Object>} - Emprunt mis à jour
     */
    async returnBook(borrowId) {
        return this.request(`/borrows/${borrowId}/return`, 'PUT');
    }

    /**
     * Récupère les emprunts pour une date spécifique (admin)
     * @param {string} date - Date au format YYYY-MM-DD
     * @returns {Promise<Array>} - Liste des emprunts
     */
    async getBorrowsByDate(date) {
        return this.request(`/borrows/date/${date}`);
    }

    /**
     * Récupère le top des livres empruntés pour un mois spécifique (admin)
     * @param {number} year - Année
     * @param {number} month - Mois (1-12)
     * @returns {Promise<Array>} - Top des livres
     */
    async getTopBorrowedBooks(year, month) {
        return this.request(`/borrows/top/${year}/${month}`);
    }

    /**
     * Récupère les statistiques des emprunts (admin)
     * @returns {Promise<Object>} - Statistiques des emprunts
     */
    async getBorrowStats() {
        return this.request('/borrows/stats');
    }

    // ------------- UTILISATEURS -------------

    /**
     * Récupère tous les utilisateurs (admin)
     * @returns {Promise<Array>} - Liste des utilisateurs
     */
    async getUsers() {
        return this.request('/users');
    }

    /**
     * Récupère un utilisateur par son ID
     * @param {number} id - ID de l'utilisateur
     * @returns {Promise<Object>} - Détails de l'utilisateur
     */
    async getUserById(id) {
        return this.request(`/users/${id}`);
    }

    /**
     * Met à jour un utilisateur
     * @param {number} id - ID de l'utilisateur
     * @param {Object} userData - Nouvelles données
     * @returns {Promise<Object>} - Utilisateur mis à jour
     */
    async updateUser(id, userData) {
        return this.request(`/users/${id}`, 'PUT', userData);
    }

    /**
     * Supprime un utilisateur (admin)
     * @param {number} id - ID de l'utilisateur
     * @returns {Promise<Object>} - Confirmation de suppression
     */
    async deleteUser(id) {
        return this.request(`/users/${id}`, 'DELETE');
    }

    /**
     * Récupère les emprunts d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @returns {Promise<Array>} - Liste des emprunts
     */
    async getUserBorrows(userId) {
        return this.request(`/users/${userId}/borrows`);
    }
}

// Exporter une instance unique du service API
const api = new ApiService();