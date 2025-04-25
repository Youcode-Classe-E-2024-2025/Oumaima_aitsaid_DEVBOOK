/**
 * Service d'authentification pour gérer les utilisateurs
 */
class AuthService {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        
        // Définir le token dans le service API
        if (this.token) {
            api.setAuthToken(this.token);
        }
    }

    /**
     * Vérifie si l'utilisateur est connecté
     * @returns {boolean} - Statut de connexion
     */
    isLoggedIn() {
        return !!this.token && !!this.user;
    }

    /**
     * Vérifie si l'utilisateur est un administrateur
     * @returns {boolean} - True si admin
     */
    isAdmin() {
        return this.isLoggedIn() && this.user.role === 'admin';
    }

    /**
     * Connexion utilisateur
     * @param {string} email - Email
     * @param {string} password - Mot de passe
     * @returns {Promise<Object>} - Données utilisateur
     */
    async login(email, password) {
        try {
            const data = await api.login(email, password);
            this.setSession(data.token, data.user);
            return data.user;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Inscription utilisateur
     * @param {string} name - Nom
     * @param {string} email - Email
     * @param {string} password - Mot de passe
     * @returns {Promise<Object>} - Données utilisateur
     */
    async register(name, email, password) {
        try {
            const data = await api.register(name, email, password);
            this.setSession(data.token, data.user);
            return data.user;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Déconnexion
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        api.setAuthToken(null);
    }

    /**
     * Configure la session utilisateur
     * @param {string} token - Token JWT
     * @param {Object} user - Données utilisateur
     */
    setSession(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        api.setAuthToken(token);
    }

    /**
     * Vérifie la validité du token
     * @returns {Promise<boolean>} - True si le token est valide
     */
    async checkToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await api.verifyToken();
            if (response.valid) {
                // Mettre à jour les informations utilisateur
                this.user = response.user;
                localStorage.setItem('user', JSON.stringify(response.user));
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Token invalide:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Met à jour le profil utilisateur
     * @param {Object} userData - Nouvelles données
     * @returns {Promise<Object>} - Utilisateur mis à jour
     */
    async updateProfile(userData) {
        if (!this.isLoggedIn()) {
            throw new Error('Utilisateur non connecté');
        }

        try {
            const updatedUser = await api.updateUser(this.user.id, userData);
            
            // Mettre à jour les informations locales
            this.user = {
                ...this.user,
                name: updatedUser.name,
                email: updatedUser.email
            };
            
            localStorage.setItem('user', JSON.stringify(this.user));
            return updatedUser;
        } catch (error) {
            throw error;
        }
    }
}

// Exporter une instance unique du service d'authentification
const auth = new AuthService();