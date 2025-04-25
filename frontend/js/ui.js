/**
 * Service UI pour gérer l'interface utilisateur
 */
class UIService {
    constructor() {
        this.currentPage = null;
    }

    /**
     * Initialise l'interface utilisateur
     */
    init() {
        // Gestionnaire pour le menu sidebar
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // Gestionnaire pour les liens du menu
        document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageName = link.getAttribute('data-page');
                this.showPage(pageName);
                
                // Mettre à jour les liens actifs
                document.querySelectorAll('.sidebar-menu a').forEach(a => {
                    a.classList.remove('active');
                });
                link.classList.add('active');
            });
        });

        // Gestionnaires de déconnexion
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
            this.updateMenuForUser();
            this.showPage('login');
            this.showToast('Vous avez été déconnecté', 'info');
        });

        document.getElementById('adminLogoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
            this.updateMenuForUser();
            this.showPage('login');
            this.showToast('Vous avez été déconnecté', 'info');
        });

        // Initialiser les gestionnaires de modales
        this.initModalHandlers();
    }

    /**
     * Initialise les gestionnaires pour les modales
     */
    initModalHandlers() {
        // Fermer les modales en cliquant sur la croix
        document.querySelectorAll('.close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        // Fermer les modales en cliquant en dehors
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    /**
     * Met à jour le menu en fonction de l'utilisateur connecté
     */
    updateMenuForUser() {
        const publicMenu = document.getElementById('publicMenu');
        const studentMenu = document.getElementById('studentMenu');
        const adminMenu = document.getElementById('adminMenu');
        const adminOnlyElements = document.querySelectorAll('.admin-only');

        if (auth.isLoggedIn()) {
            publicMenu.classList.add('hidden');
            
            if (auth.isAdmin()) {
                adminMenu.classList.remove('hidden');
                studentMenu.classList.add('hidden');
                adminOnlyElements.forEach(el => el.classList.remove('hidden'));
            } else {
                studentMenu.classList.remove('hidden');
                adminMenu.classList.add('hidden');
                adminOnlyElements.forEach(el => el.classList.add('hidden'));
            }
        } else {
            publicMenu.classList.remove('hidden');
            studentMenu.classList.add('hidden');
            adminMenu.classList.add('hidden');
            adminOnlyElements.forEach(el => el.classList.add('hidden'));
        }
    }

    /**
     * Affiche une page spécifique
     * @param {string} pageName - Nom de la page
     */
    showPage(pageName) {
        // Cacher toutes les pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // Afficher la page demandée
        const page = document.getElementById(`${pageName}Page`);
        if (page) {
            page.classList.remove('hidden');
            this.currentPage = pageName;
            
            // Exécuter une action spécifique pour la page si nécessaire
            if (typeof this[`on${pageName.charAt(0).toUpperCase() + pageName.slice(1)}PageLoad`] === 'function') {
                this[`on${pageName.charAt(0).toUpperCase() + pageName.slice(1)}PageLoad`]();
            }
        }
    }

    /**
     * Affiche une notification toast
     * @param {string} message - Message à afficher
     * @param {string} type - Type de notification (success, error, warning, info)
     * @param {number} duration - Durée d'affichage en ms
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast';
        toast.classList.add(type);
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    /**
     * Ouvre une modale
     * @param {string} modalId - ID de la modale
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Ferme une modale
     * @param {string} modalId - ID de la modale
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Affiche une modale de confirmation
     * @param {string} message - Message de confirmation
     * @param {Function} onConfirm - Fonction à exécuter si confirmé
     */
    showConfirmDialog(message, onConfirm) {
        const confirmModal = document.getElementById('confirmModal');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');

        // Définir le message
        confirmMessage.textContent = message;

        // Gestionnaire de confirmation
        const handleConfirm = () => {
            onConfirm();
            this.closeModal('confirmModal');
            cleanup();
        };

        // Gestionnaire d'annulation
        const handleCancel = () => {
            this.closeModal('confirmModal');
            cleanup();
        };

        // Nettoyage des gestionnaires
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        // Ajouter les gestionnaires
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        // Afficher la modale
        this.openModal('confirmModal');
    }

    /**
     * Crée un élément de pagination
     * @param {number} currentPage - Page courante
     * @param {number} totalPages - Nombre total de pages
     * @param {Function} onPageChange - Fonction à exécuter lors du changement de page
     * @param {string} containerId - ID du conteneur de pagination
     */
    createPagination(currentPage, totalPages, onPageChange, containerId) {
        const paginationContainer = document.getElementById(containerId);
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) {
            return;
        }

        // Bouton précédent
        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.classList.add('pagination-btn');
            prevBtn.innerHTML = '&laquo;';
            prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
            paginationContainer.appendChild(prevBtn);
        }

        // Pages
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.classList.add('pagination-btn');
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => onPageChange(i));
            paginationContainer.appendChild(pageBtn);
        }

        // Bouton suivant
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.classList.add('pagination-btn');
            nextBtn.innerHTML = '&raquo;';
            nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
            paginationContainer.appendChild(nextBtn);
        }
    }

    /**
     * Affiche l'état de chargement
     * @param {string} containerId - ID du conteneur
     * @param {boolean} isLoading - État de chargement
     * @param {string} message - Message à afficher
     */
    setLoading(containerId, isLoading, message = 'Chargement...') {
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        // Supprimer le loader existant
        const existingLoader = container.querySelector('.loading');
        if (existingLoader) {
            existingLoader.remove();
        }
        
        if (isLoading) {
            const loader = document.createElement('div');
            loader.className = 'loading';
            
            const spinnerElem = document.createElement('div');
            spinnerElem.className = 'loader';
            
            const textElem = document.createElement('span');
            textElem.textContent = message;
            
            loader.appendChild(spinnerElem);
            loader.appendChild(textElem);
            container.appendChild(loader);
        }
    }

    /**
     * Formate une date
     * @param {string} dateStr - Date au format ISO
     * @param {boolean} withTime - Inclure l'heure
     * @returns {string} - Date formatée
     */
    formatDate(dateStr, withTime = false) {
        if (!dateStr) return '-';
        
        const date = new Date(dateStr);
        
        if (isNaN(date.getTime())) {
            return dateStr; // Retourner la chaîne originale si la date est invalide
        }
        
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };
        
        if (withTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return date.toLocaleDateString('fr-FR', options);
    }
}

// Exporter une instance unique du service UI
const ui = new UIService();