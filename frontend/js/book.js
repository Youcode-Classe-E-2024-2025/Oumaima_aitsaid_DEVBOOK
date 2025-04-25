/**
 * Gestion des livres
 */

// État des livres
const bookState = {
    books: [],
    filteredBooks: [],
    categories: [],
    currentPage: 1,
    itemsPerPage: 8,
    totalPages: 1,
    filter: 'all',
    searchTerm: '',
    sortBy: 'title_asc'
};

// Initialiser la page des livres
ui.onBooksPageLoad = async function() {
    if (!auth.isLoggedIn()) {
        ui.showPage('login');
        return;
    }
    
    ui.setLoading('booksGrid', true);
    
    try {
        // Charger les catégories (pour les filtres et formulaires)
        if (bookState.categories.length === 0) {
            const categories = await api.getCategories();
            bookState.categories = categories;
        }
        
        // Charger les livres
        const books = await api.getBooks();
        bookState.books = books;
        bookState.filteredBooks = [...books];
        
        // Calculer le nombre total de pages
        bookState.totalPages = Math.ceil(bookState.filteredBooks.length / bookState.itemsPerPage);
        
        // Afficher les livres
        renderBooks();
        
        // Initialiser les gestionnaires d'événements
        initBookEventHandlers();
    } catch (error) {
        console.error('Erreur lors du chargement des livres:', error);
        ui.showToast('Erreur lors du chargement des livres', 'error');
    } finally {
        ui.setLoading('booksGrid', false);
    }
};

/**
 * Initialiser les gestionnaires d'événements pour les livres
 */
function initBookEventHandlers() {
    // Gestionnaire pour le bouton d'ajout de livre (admin uniquement)
    const addBookBtn = document.getElementById('addBookBtn');
    if (addBookBtn) {
        addBookBtn.addEventListener('click', showAddBookModal);
    }
    
    // Gestionnaire de recherche
    const searchInput = document.getElementById('searchBooks');
    const searchBtn = document.getElementById('searchBtn');
    
    searchInput.addEventListener('input', (e) => {
        bookState.searchTerm = e.target.value.trim().toLowerCase();
        applyFilters();
    });
    
    searchBtn.addEventListener('click', () => {
        applyFilters();
    });
    
    // Gestionnaire pour les boutons de filtre
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            bookState.filter = btn.getAttribute('data-filter');
            applyFilters();
        });
    });
    
    // Gestionnaire pour le tri
    document.getElementById('sortBooks').addEventListener('change', (e) => {
        bookState.sortBy = e.target.value;
        applyFilters();
    });
    
    // Initialiser les étoiles de notation dans la modale
    document.querySelectorAll('.rating .star').forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.getAttribute('data-value'));
            document.getElementById('bookRating').value = value;
            updateStars(value);
        });
        
        star.addEventListener('mouseover', () => {
            const value = parseInt(star.getAttribute('data-value'));
            previewStars(value);
        });
        
        star.addEventListener('mouseout', () => {
            const currentRating = parseInt(document.getElementById('bookRating').value);
            updateStars(currentRating);
        });
    });
    
    // Afficher/masquer les étoiles selon le statut
    document.getElementById('bookStatus').addEventListener('change', (e) => {
        const status = e.target.value;
        const ratingGroup = document.getElementById('ratingGroup');
        
        if (status === 'read') {
            ratingGroup.style.display = 'block';
        } else {
            ratingGroup.style.display = 'none';
            document.getElementById('bookRating').value = '0';
            updateStars(0);
        }
    });
    
    // Gestionnaire pour le formulaire d'ajout/modification de livre
    document.getElementById('bookForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const bookId = document.getElementById('bookId').value;
        const title = document.getElementById('bookTitle').value;
        const author = document.getElementById('bookAuthor').value;
        const categoryId = parseInt(document.getElementById('bookCategory').value);
        const status = document.getElementById('bookStatus').value;
        const rating = parseInt(document.getElementById('bookRating').value || 0);
        const description = document.getElementById('bookDescription').value;
        
        const bookData = {
            title,
            author,
            category_id: categoryId,
            status,
            rating,
            description
        };
        
        try {
            ui.showToast('Sauvegarde en cours...', 'info');
            
            if (bookId) {
                // Mise à jour
                await api.updateBook(bookId, bookData);
                ui.showToast('Livre mis à jour avec succès', 'success');
            } else {
                // Création
                await api.createBook(bookData);
                ui.showToast('Livre ajouté avec succès', 'success');
            }
            
            // Fermer la modale
            ui.closeModal('bookModal');
            
            // Recharger les livres
            const books = await api.getBooks();
            bookState.books = books;
            bookState.filteredBooks = [...books];
            applyFilters();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du livre:', error);
            ui.showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
        }
    });
}

/**
 * Afficher la modale d'ajout de livre
 */
function showAddBookModal() {
    // Réinitialiser le formulaire
    document.getElementById('bookModalTitle').textContent = 'Ajouter un livre';
    document.getElementById('bookForm').reset();
    document.getElementById('bookId').value = '';
    document.getElementById('ratingGroup').style.display = 'none';
    updateStars(0);
    
    // Remplir les catégories
    const categorySelect = document.getElementById('bookCategory');
    categorySelect.innerHTML = '';
    
    bookState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    // Ouvrir la modale
    ui.openModal('bookModal');
}

/**
 * Afficher la modale de modification d'un livre
 * @param {Object} book - Livre à modifier
 */
function showEditBookModal(book) {
    // Définir le titre de la modale
    document.getElementById('bookModalTitle').textContent = 'Modifier le livre';
    
    // Remplir le formulaire
    document.getElementById('bookId').value = book.id;
    document.getElementById('bookTitle').value = book.title;
    document.getElementById('bookAuthor').value = book.author;
    document.getElementById('bookStatus').value = book.status;
    document.getElementById('bookRating').value = book.rating;
    document.getElementById('bookDescription').value = book.description || '';
    
    // Gérer l'affichage des étoiles
    if (book.status === 'read') {
        document.getElementById('ratingGroup').style.display = 'block';
        updateStars(book.rating);
    } else {
        document.getElementById('ratingGroup').style.display = 'none';
    }
    
    // Remplir les catégories
    const categorySelect = document.getElementById('bookCategory');
    categorySelect.innerHTML = '';
    
    bookState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        if (category.id === book.category_id) {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });
    
    // Ouvrir la modale
    ui.openModal('bookModal');
}

/**
 * Supprimer un livre
 * @param {number} bookId - ID du livre à supprimer
 */
async function deleteBook(bookId) {
    ui.showConfirmDialog('Êtes-vous sûr de vouloir supprimer ce livre?', async () => {
        try {
            await api.deleteBook(bookId);
            
            // Mettre à jour la liste
            bookState.books = bookState.books.filter(book => book.id !== bookId);
            bookState.filteredBooks = bookState.filteredBooks.filter(book => book.id !== bookId);
            
            // Recalculer le nombre de pages
            bookState.totalPages = Math.ceil(bookState.filteredBooks.length / bookState.itemsPerPage);
            
            // Ajuster la page courante si nécessaire
            if (bookState.currentPage > bookState.totalPages) {
                bookState.currentPage = bookState.totalPages || 1;
            }
            
            // Rafraîchir l'affichage
            renderBooks();
            
            ui.showToast('Livre supprimé avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression du livre:', error);
            ui.showToast(error.message || 'Erreur lors de la suppression', 'error');
        }
    });
}

/**
 * Emprunter un livre
 * @param {number} bookId - ID du livre à emprunter
 */
async function borrowBook(bookId) {
    try {
        await api.createBorrow(bookId);
        ui.showToast('Livre emprunté avec succès', 'success');
        
        // Recharger les livres pour mettre à jour le statut
        const books = await api.getBooks();
        bookState.books = books;
        bookState.filteredBooks = [...books];
        applyFilters();
    } catch (error) {
        console.error('Erreur lors de l\'emprunt du livre:', error);
        ui.showToast(error.message || 'Erreur lors de l\'emprunt', 'error');
    }
}

/**
 * Appliquer les filtres et le tri
 */
function applyFilters() {
    // Réinitialiser la page courante
    bookState.currentPage = 1;
    
    // Filtrer par status et recherche
    bookState.filteredBooks = bookState.books.filter(book => {
        // Filtrer par statut
        if (bookState.filter !== 'all' && book.status !== bookState.filter) {
            return false;
        }
        
        // Filtrer par recherche
        if (bookState.searchTerm) {
            const searchTerm = bookState.searchTerm.toLowerCase();
            return (
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                (book.description && book.description.toLowerCase().includes(searchTerm))
            );
        }
        
        return true;
    });
    
    // Appliquer le tri
    const [sortField, sortOrder] = bookState.sortBy.split('_');
    
    bookState.filteredBooks.sort((a, b) => {
        let compareResult;
        
        if (sortField === 'title') {
            compareResult = a.title.localeCompare(b.title);
        } else if (sortField === 'author') {
            compareResult = a.author.localeCompare(b.author);
        } else {
            compareResult = 0;
        }
        
        return sortOrder === 'asc' ? compareResult : -compareResult;
    });
    
    // Recalculer le nombre total de pages
    bookState.totalPages = Math.ceil(bookState.filteredBooks.length / bookState.itemsPerPage);
    
    // Afficher les livres filtrés
    renderBooks();
}

/**
 * Afficher les livres avec pagination
 */
function renderBooks() {
    const booksGrid = document.getElementById('booksGrid');
    booksGrid.innerHTML = '';
    
    if (bookState.filteredBooks.length === 0) {
        const noBooks = document.createElement('div');
        noBooks.className = 'no-books';
        noBooks.textContent = 'Aucun livre trouvé';
        booksGrid.appendChild(noBooks);
        
        // Masquer la pagination
        document.getElementById('booksPagination').innerHTML = '';
        return;
    }
    
    // Calculer l'intervalle à afficher
    const startIndex = (bookState.currentPage - 1) * bookState.itemsPerPage;
    const endIndex = Math.min(startIndex + bookState.itemsPerPage, bookState.filteredBooks.length);
    const booksToDisplay = bookState.filteredBooks.slice(startIndex, endIndex);
    
    // Créer les cartes de livres
    booksToDisplay.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
    
    // Mettre à jour la pagination
    ui.createPagination(
        bookState.currentPage,
        bookState.totalPages,
        (page) => {
            bookState.currentPage = page;
            renderBooks();
        },
        'booksPagination'
    );
}

/**
 * Créer une carte de livre
 * @param {Object} book - Livre à afficher
 * @returns {HTMLElement} - Élément HTML de la carte
 */
function createBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    
    // Trouver le nom de la catégorie
    const category = bookState.categories.find(cat => cat.id === book.category_id);
    const categoryName = category ? category.name : 'Non catégorisé';
    
    // Statut du livre
    const statusLabel = getStatusLabel(book.status);
    const statusClass = `status-${book.status}`;
    
    bookCard.innerHTML = `
        <div class="book-status ${statusClass}">${statusLabel}</div>
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">par ${book.author}</p>
        <p class="book-category">Catégorie: ${categoryName}</p>
        ${book.status === 'read' ? `<div class="book-rating">${renderStars(book.rating)}</div>` : ''}
        <div class="book-actions">
            ${auth.isAdmin() ? `
                <button class="btn btn-primary edit-book" data-id="${book.id}">Modifier</button>
                <button class="btn btn-danger delete-book" data-id="${book.id}">Supprimer</button>
            ` : `
                <button class="btn btn-primary borrow-book" data-id="${book.id}">Emprunter</button>
            `}
        </div>
    `;
    
    // Ajouter les gestionnaires d'événements
    if (auth.isAdmin()) {
        bookCard.querySelector('.edit-book').addEventListener('click', () => {
            showEditBookModal(book);
        });
        
        bookCard.querySelector('.delete-book').addEventListener('click', () => {
            deleteBook(book.id);
        });
    } else {
        bookCard.querySelector('.borrow-book').addEventListener('click', () => {
            borrowBook(book.id);
        });
    }
    
    return bookCard;
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

/**
 * Mettre à jour l'affichage des étoiles dans le formulaire
 * @param {number} rating - Note (0-5)
 */
function updateStars(rating) {
    document.querySelectorAll('.rating .star').forEach((star, index) => {
        if (index < rating) {
            star.textContent = '★';
            star.classList.add('active');
        } else {
            star.textContent = '☆';
            star.classList.remove('active');
        }
    });
}

/**
 * Prévisualiser les étoiles au survol
 * @param {number} rating - Note (0-5)
 */
function previewStars(rating) {
    document.querySelectorAll('.rating .star').forEach((star, index) => {
        if (index < rating) {
            star.textContent = '★';
        } else {
            star.textContent = '☆';
        }
    });
}