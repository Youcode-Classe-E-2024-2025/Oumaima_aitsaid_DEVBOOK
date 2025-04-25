/**
 * Gestion des catégories
 */

// État des catégories
const categoryState = {
    categories: [],
    selectedCategoryId: null
};

// Initialiser la page des catégories
ui.onCategoriesPageLoad = async function() {
    if (!auth.isLoggedIn()) {
        ui.showPage('login');
        return;
    }
    
    ui.setLoading('categoriesGrid', true);
    
    try {
        // Charger les catégories
        const categories = await api.getCategories();
        categoryState.categories = categories;
        
        // Obtenir les statistiques (nombre de livres par catégorie)
        const stats = await api.getCategoryStats();
        
        // Fusionner les statistiques avec les catégories
        categoryState.categories = categoryState.categories.map(category => {
            const stat = stats.find(s => s.id === category.id);
            return {
                ...category,
                bookCount: stat ? stat.book_count : 0
            };
        });
        
        // Afficher les catégories
        renderCategories();
        
        // Initialiser les gestionnaires d'événements
        initCategoryEventHandlers();
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
        ui.showToast('Erreur lors du chargement des catégories', 'error');
    } finally {
        ui.setLoading('categoriesGrid', false);
    }
};

/**
 * Initialiser les gestionnaires d'événements pour les catégories
 */
function initCategoryEventHandlers() {
    // Gestionnaire pour le bouton d'ajout de catégorie (admin uniquement)
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', showAddCategoryModal);
    }
    
    // Gestionnaire pour le formulaire d'ajout/modification de catégorie
    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const categoryId = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value;
        const description = document.getElementById('categoryDescription').value;
        
        const categoryData = {
            name,
            description
        };
        
        try {
            ui.showToast('Sauvegarde en cours...', 'info');
            
            if (categoryId) {
                // Mise à jour
                await api.updateCategory(categoryId, categoryData);
                ui.showToast('Catégorie mise à jour avec succès', 'success');
            } else {
                // Création
                await api.createCategory(categoryData);
                ui.showToast('Catégorie ajoutée avec succès', 'success');
            }
            
            // Fermer la modale
            ui.closeModal('categoryModal');
            
            // Recharger les catégories
            ui.onCategoriesPageLoad();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la catégorie:', error);
            ui.showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
        }
    });
}

/**
 * Afficher les catégories
 */
function renderCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    categoriesGrid.innerHTML = '';
    
    if (categoryState.categories.length === 0) {
        const noCategories = document.createElement('div');
        noCategories.className = 'no-categories';
        noCategories.textContent = 'Aucune catégorie trouvée';
        categoriesGrid.appendChild(noCategories);
        return;
    }
    
    // Trier par nombre de livres décroissant
    const sortedCategories = [...categoryState.categories].sort((a, b) => b.bookCount - a.bookCount);
    
    // Créer les cartes de catégories
    sortedCategories.forEach(category => {
        const categoryCard = createCategoryCard(category);
        categoriesGrid.appendChild(categoryCard);
    });
}

/**
 * Créer une carte de catégorie
 * @param {Object} category - Catégorie à afficher
 * @returns {HTMLElement} - Élément HTML de la carte
 */
function createCategoryCard(category) {
    const categoryCard = document.createElement('div');
    categoryCard.className = 'category-card';
    categoryCard.setAttribute('data-id', category.id);
    
    categoryCard.innerHTML = `
        <h3 class="category-name">${category.name}</h3>
        <p>${category.description || 'Aucune description'}</p>
        <p class="category-count">
            <i class="fas fa-book"></i> ${category.bookCount} livre${category.bookCount !== 1 ? 's' : ''}
        </p>
        ${auth.isAdmin() ? `
            <div class="category-actions">
                <button class="btn btn-primary edit-category">Modifier</button>
                <button class="btn btn-danger delete-category">Supprimer</button>
            </div>
        ` : ''}
    `;
    
    // Ajouter les gestionnaires d'événements
    categoryCard.addEventListener('click', () => {
        viewCategoryBooks(category.id);
    });
    
    if (auth.isAdmin()) {
        // Arrêter la propagation pour les boutons (éviter le clic sur la carte)
        const actionButtons = categoryCard.querySelectorAll('.category-actions button');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
        
        categoryCard.querySelector('.edit-category').addEventListener('click', () => {
            showEditCategoryModal(category);
        });
        
        categoryCard.querySelector('.delete-category').addEventListener('click', () => {
            deleteCategory(category.id);
        });
    }
    
    return categoryCard;
}

/**
 * Afficher la modale d'ajout de catégorie
 */
function showAddCategoryModal() {
    // Réinitialiser le formulaire
    document.getElementById('categoryModalTitle').textContent = 'Ajouter une catégorie';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    
    // Ouvrir la modale
    ui.openModal('categoryModal');
}

/**
 * Afficher la modale de modification d'une catégorie
 * @param {Object} category - Catégorie à modifier
 */
function showEditCategoryModal(category) {
    // Définir le titre de la modale
    document.getElementById('categoryModalTitle').textContent = 'Modifier la catégorie';
    
    // Remplir le formulaire
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    
    // Ouvrir la modale
    ui.openModal('categoryModal');
}

/**
 * Supprimer une catégorie
 * @param {number} categoryId - ID de la catégorie à supprimer
 */
async function deleteCategory(categoryId) {
    ui.showConfirmDialog('Êtes-vous sûr de vouloir supprimer cette catégorie? Les livres associés ne seront pas supprimés mais perdront leur catégorie.', async () => {
        try {
            await api.deleteCategory(categoryId);
            
            // Mettre à jour la liste
            categoryState.categories = categoryState.categories.filter(cat => cat.id !== categoryId);
            
            // Rafraîchir l'affichage
            renderCategories();
            
            ui.showToast('Catégorie supprimée avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression de la catégorie:', error);
            ui.showToast(error.message || 'Erreur lors de la suppression', 'error');
        }
    });
}

/**
 * Voir les livres d'une catégorie spécifique
 * @param {number} categoryId - ID de la catégorie
 */
async function viewCategoryBooks(categoryId) {
    try {
        ui.setLoading('categoriesGrid', true);
        
        // Récupérer les détails de la catégorie avec ses livres
        const categoryDetails = await api.getCategoryById(categoryId);
        
        // Créer une modale temporaire pour afficher les livres
        const modalId = 'categoryBooksModal';
        
        // Vérifier si la modale existe déjà
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2 id="categoryBooksTitle"></h2>
                    <div id="categoryBooksContainer"></div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Ajouter le gestionnaire de fermeture
            modal.querySelector('.close-modal').addEventListener('click', () => {
                ui.closeModal(modalId);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    ui.closeModal(modalId);
                }
            });
        }
        
        // Mettre à jour le contenu
        const categoryBooksTitle = document.getElementById('categoryBooksTitle');
        const categoryBooksContainer = document.getElementById('categoryBooksContainer');
        
        categoryBooksTitle.textContent = `Livres de la catégorie "${categoryDetails.name}"`;
        
        // Afficher les livres
        const books = categoryDetails.books || [];
        
        if (books.length === 0) {
            categoryBooksContainer.innerHTML = '<p>Aucun livre dans cette catégorie</p>';
        } else {
            categoryBooksContainer.innerHTML = '';
            
            // Créer un tableau pour afficher les livres
            const table = document.createElement('table');
            table.className = 'data-table';
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Titre</th>
                        <th>Auteur</th>
                        <th>Statut</th>
                        <th>Note</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tbody = table.querySelector('tbody');
            
            books.forEach(book => {
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${getStatusLabel(book.status)}</td>
                    <td>${book.status === 'read' ? renderStars(book.rating) : '-'}</td>
                `;
                
                tbody.appendChild(tr);
            });
            
            categoryBooksContainer.appendChild(table);
        }
        
        // Ouvrir la modale
        ui.openModal(modalId);
    } catch (error) {
        console.error('Erreur lors de la récupération des livres de la catégorie:', error);
        ui.showToast('Erreur lors de la récupération des livres', 'error');
    } finally {
        ui.setLoading('categoriesGrid', false);
    }
}

/**
 * Obtenir le libellé du statut
 * @param {string} status - Code du statut
 * @returns {string} - Libellé du statut
 */
function getStatusLabel(status) {
    switch (status) {
        case 'to_read': return 'À lire';
        case 'reading': return 'En cours';
        case 'read': return 'Lu';
        default: return status;
    }
}

/**
 * Générer les étoiles pour l'affichage de la note
 * @param {number} rating - Note du livre (0-5)
 * @returns {string} - HTML des étoiles
 */
function renderStars(rating) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(i <= rating ? '★' : '☆');
    }
    return stars.join('');
}