/**
 * Gestion des emprunts
 */

// État des emprunts
const borrowState = {
    borrows: [],
    filteredBorrows: [],
    myBorrows: [],
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    filter: 'all' // 'all', 'active', 'overdue', 'returned'
};

// Initialiser la page de tous les emprunts (admin)
ui.onBorrowsPageLoad = async function() {
    if (!auth.isLoggedIn() || !auth.isAdmin()) {
        ui.showPage('login');
        return;
    }
    
    ui.setLoading('borrowsTable', true);
    
    try {
        // Charger tous les emprunts
        const borrows = await api.getAllBorrows();
        borrowState.borrows = borrows;
        borrowState.filteredBorrows = [...borrows];
        
        // Calculer le nombre total de pages
        borrowState.totalPages = Math.ceil(borrowState.filteredBorrows.length / borrowState.itemsPerPage);
        
        // Afficher les emprunts
        renderBorrows();
        
        // Initialiser les gestionnaires d'événements
        initBorrowEventHandlers();
    } catch (error) {
        console.error('Erreur lors du chargement des emprunts:', error);
        ui.showToast('Erreur lors du chargement des emprunts', 'error');
    } finally {
        ui.setLoading('borrowsTable', false);
    }
};

// Initialiser la page de mes emprunts (étudiant)
ui.onMyBorrowsPageLoad = async function() {
    if (!auth.isLoggedIn()) {
        ui.showPage('login');
        return;
    }
    
    ui.setLoading('myBorrowsList', true);
    
    try {
        // Charger mes emprunts
        const myBorrows = await api.getMyBorrows();
        borrowState.myBorrows = myBorrows;
        
        // Afficher mes emprunts
        renderMyBorrows();
    } catch (error) {
        console.error('Erreur lors du chargement de mes emprunts:', error);
        ui.showToast('Erreur lors du chargement de vos emprunts', 'error');
    } finally {
        ui.setLoading('myBorrowsList', false);
    }
};

/**
 * Initialiser les gestionnaires d'événements pour les emprunts
 */
function initBorrowEventHandlers() {
    // Gestionnaire pour les boutons de filtre
    document.querySelectorAll('.borrow-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.borrow-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            borrowState.filter = btn.getAttribute('data-filter');
            applyBorrowFilters();
        });
    });
    
    // Gestionnaire pour le filtre par date
    document.getElementById('filterDateBtn').addEventListener('click', async () => {
        const date = document.getElementById('borrowDate').value;
        
        if (!date) {
            ui.showToast('Veuillez sélectionner une date', 'warning');
            return;
        }
        
        try {
            ui.setLoading('borrowsTable', true);
            
            // Récupérer les emprunts pour cette date
            const borrows = await api.getBorrowsByDate(date);
            
            borrowState.filteredBorrows = borrows;
            borrowState.currentPage = 1;
            borrowState.totalPages = Math.ceil(borrows.length / borrowState.itemsPerPage);
            
            renderBorrows();
            
            // Mettre à jour les filtres actifs
            document.querySelectorAll('.borrow-filter-btn').forEach(b => b.classList.remove('active'));
            
            ui.showToast(`${borrows.length} emprunt(s) trouvé(s) pour le ${ui.formatDate(date)}`, 'info');
        } catch (error) {
            console.error('Erreur lors de la recherche par date:', error);
            ui.showToast('Erreur lors de la recherche', 'error');
        } finally {
            ui.setLoading('borrowsTable', false);
        }
    });
}

/**
 * Appliquer les filtres sur les emprunts
 */
function applyBorrowFilters() {
    borrowState.currentPage = 1;
    
    if (borrowState.filter === 'all') {
        borrowState.filteredBorrows = [...borrowState.borrows];
    } else {
        borrowState.filteredBorrows = borrowState.borrows.filter(borrow => {
            if (borrowState.filter === 'active') {
                return borrow.return_date === null;
            } else if (borrowState.filter === 'overdue') {
                return borrow.return_date === null && borrow.days_overdue > 0;
            } else if (borrowState.filter === 'returned') {
                return borrow.return_date !== null;
            }
            return true;
        });
    }
    
    borrowState.totalPages = Math.ceil(borrowState.filteredBorrows.length / borrowState.itemsPerPage);
    
    renderBorrows();
}

/**
 * Afficher tous les emprunts avec pagination (admin)
 */
function renderBorrows() {
    const tbody = document.querySelector('#borrowsTable tbody');
    tbody.innerHTML = '';
    
    if (borrowState.filteredBorrows.length === 0) {
        // Créer une ligne pour indiquer l'absence de données
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" class="text-center">Aucun emprunt trouvé</td>`;
        tbody.appendChild(tr);
        
        // Masquer la pagination
        document.getElementById('borrowsPagination').innerHTML = '';
        return;
    }
    
    // Calculer l'intervalle à afficher
    const startIndex = (borrowState.currentPage - 1) * borrowState.itemsPerPage;
    const endIndex = Math.min(startIndex + borrowState.itemsPerPage, borrowState.filteredBorrows.length);
    const borrowsToDisplay = borrowState.filteredBorrows.slice(startIndex, endIndex);
    
    // Créer les lignes de la table
    borrowsToDisplay.forEach(borrow => {
        const tr = document.createElement('tr');
        
        // Déterminer le statut
        let status, statusClass;
        if (borrow.return_date) {
            status = 'Rendu';
            statusClass = 'success';
        } else if (borrow.days_overdue > 0) {
            status = `En retard (${borrow.days_overdue} jour${borrow.days_overdue > 1 ? 's' : ''})`;
            statusClass = 'danger';
        } else {
            status = 'En cours';
            statusClass = 'info';
        }
        
        tr.innerHTML = `
            <td>${borrow.id}</td>
            <td>${borrow.book_title}</td>
            <td>${borrow.user_name}</td>
            <td>${ui.formatDate(borrow.borrow_date)}</td>
            <td>${ui.formatDate(borrow.expected_return_date)}</td>
            <td>${borrow.return_date ? ui.formatDate(borrow.return_date) : '-'}</td>
            <td><span class="borrow-status ${statusClass}">${status}</span></td>
            <td>
                ${!borrow.return_date ? `
                    <button class="btn btn-small btn-primary return-book" data-id="${borrow.id}">
                        Marquer comme rendu
                    </button>
                ` : ''}
            </td>
        `;
        
        // Ajouter les gestionnaires d'événements
        if (!borrow.return_date) {
            tr.querySelector('.return-book').addEventListener('click', () => {
                returnBook(borrow.id);
            });
        }
        
        tbody.appendChild(tr);
    });
    
    // Mettre à jour la pagination
    ui.createPagination(
        borrowState.currentPage,
        borrowState.totalPages,
        (page) => {
            borrowState.currentPage = page;
            renderBorrows();
        },
        'borrowsPagination'
    );
}

/**
 * Afficher mes emprunts (étudiant)
 */
function renderMyBorrows() {
    const myBorrowsList = document.getElementById('myBorrowsList');
    myBorrowsList.innerHTML = '';
    
    if (borrowState.myBorrows.length === 0) {
        myBorrowsList.innerHTML = '<p class="no-borrows">Vous n\'avez aucun emprunt</p>';
        return;
    }
    
    // Trier par date d'emprunt décroissante
    const sortedBorrows = [...borrowState.myBorrows].sort(
        (a, b) => new Date(b.borrow_date) - new Date(a.borrow_date)
    );
    
    // Créer les cartes d'emprunt
    sortedBorrows.forEach(borrow => {
        const borrowCard = createBorrowCard(borrow);
        myBorrowsList.appendChild(borrowCard);
    });
}

/**
 * Créer une carte d'emprunt
 * @param {Object} borrow - Emprunt à afficher
 * @returns {HTMLElement} - Élément HTML de la carte
 */
function createBorrowCard(borrow) {
    const borrowCard = document.createElement('div');
    borrowCard.className = 'borrow-card';
    
    // Déterminer le statut
    let status, statusClass;
    if (borrow.return_date) {
        status = 'Rendu';
        statusClass = 'returned';
    } else if (borrow.days_overdue > 0) {
        status = `En retard (${borrow.days_overdue} jour${borrow.days_overdue > 1 ? 's' : ''})`;
        statusClass = 'overdue';
        borrowCard.classList.add('overdue');
    } else {
        status = 'En cours';
        statusClass = 'active';
    }
    
    borrowCard.innerHTML = `
        <h3>${borrow.book_title}</h3>
        <p>par ${borrow.book_author}</p>
        <p><strong>Emprunté le:</strong> ${ui.formatDate(borrow.borrow_date)}</p>
        <p><strong>À rendre avant le:</strong> ${ui.formatDate(borrow.expected_return_date)}</p>
        ${borrow.return_date ? `<p><strong>Rendu le:</strong> ${ui.formatDate(borrow.return_date)}</p>` : ''}
        <div class="borrow-status ${statusClass}">${status}</div>
        ${!borrow.return_date ? `
            <div class="book-actions">
                <button class="btn btn-primary return-book" data-id="${borrow.id}">
                    Marquer comme rendu
                </button>
            </div>
        ` : ''}
    `;
    
    // Ajouter les gestionnaires d'événements
    if (!borrow.return_date) {
        borrowCard.querySelector('.return-book').addEventListener('click', () => {
            returnBook(borrow.id);
        });
    }
    
    return borrowCard;
}

/**
 * Marquer un livre comme rendu
 * @param {number} borrowId - ID de l'emprunt
 */
async function returnBook(borrowId) {
    try {
        ui.showToast('Traitement en cours...', 'info');
        
        // Appeler l'API pour marquer comme rendu
        await api.returnBook(borrowId);
        
        ui.showToast('Livre marqué comme rendu', 'success');
        
        // Mettre à jour l'affichage selon la page actuelle
        if (ui.currentPage === 'borrows') {
            // Recharger tous les emprunts (admin)
            const borrows = await api.getAllBorrows();
            borrowState.borrows = borrows;
            borrowState.filteredBorrows = [...borrows];
            
            // Réappliquer les filtres
            applyBorrowFilters();
        } else if (ui.currentPage === 'myBorrows') {
            // Recharger mes emprunts (étudiant)
            const myBorrows = await api.getMyBorrows();
            borrowState.myBorrows = myBorrows;
            
            renderMyBorrows();
        }
    } catch (error) {
        console.error('Erreur lors du retour du livre:', error);
        ui.showToast(error.message || 'Erreur lors du retour du livre', 'error');
    }
}