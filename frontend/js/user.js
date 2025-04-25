
const userState = {
    users: []
};

ui.onUsersPageLoad = async function() {
    if (!auth.isLoggedIn() || !auth.isAdmin()) {
        ui.showPage('login');
        return;
    }
    
    ui.setLoading('usersTable', true);
    
    try {
        const users = await api.getUsers();
        userState.users = users;
        
        renderUsers();
        initUserEventHandlers();
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        ui.showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
        ui.setLoading('usersTable', false);
    }
};

function initUserEventHandlers() {
    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        const roleId = document.getElementById('userRole').value;
        const password = document.getElementById('userPassword').value;
        
        const userData = {
            name,
            email,
            role_id: roleId
        };
        
        if (password) {
            userData.password = password;
        }
        
        try {
            ui.showToast('Mise à jour en cours...', 'info');
            
            await api.updateUser(userId, userData);
            
            ui.closeModal('userModal');
            ui.showToast('Utilisateur mis à jour avec succès', 'success');
            
            // Recharger les utilisateurs
            const users = await api.getUsers();
            userState.users = users;
            renderUsers();
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
            ui.showToast(error.message || 'Erreur lors de la mise à jour', 'error');
        }
    });
}

function renderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    
    if (userState.users.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" class="text-center">Aucun utilisateur trouvé</td>`;
        tbody.appendChild(tr);
        return;
    }
    
    const sortedUsers = [...userState.users].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.name.localeCompare(b.name);
    });
    
    sortedUsers.forEach(user => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="user-role ${user.role}">${user.role}</span></td>
            <td>${ui.formatDate(user.created_at)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-small btn-primary edit-user" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.id !== auth.user.id ? `
                        <button class="btn btn-small btn-danger delete-user" data-id="${user.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-small btn-info view-borrows" data-id="${user.id}">
                        <i class="fas fa-book"></i>
                    </button>
                </div>
            </td>
        `;
        
        tr.querySelector('.edit-user').addEventListener('click', () => {
            showEditUserModal(user);
        });
        
        if (user.id !== auth.user.id) {
            tr.querySelector('.delete-user').addEventListener('click', () => {
                deleteUser(user.id, user.name);
            });
        }
        
        tr.querySelector('.view-borrows').addEventListener('click', () => {
            viewUserBorrows(user.id, user.name);
        });
        
        tbody.appendChild(tr);
    });
}

/**
 * Afficher la modale d'édition utilisateur
 * @param {Object} user - Utilisateur à modifier
 */
function showEditUserModal(user) {
    // Définir le titre de la modale
    document.getElementById('userModalTitle').textContent = `Modifier l'utilisateur: ${user.name}`;
    
    // Remplir le formulaire
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPassword').value = '';
    
    // Définir le rôle
    const roleSelect = document.getElementById('userRole');
    roleSelect.value = user.role === 'admin' ? '1' : '2';
    
    // Ouvrir la modale
    ui.openModal('userModal');
}

/**
 * Supprimer un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @param {string} userName - Nom de l'utilisateur
 */
function deleteUser(userId, userName) {
    ui.showConfirmDialog(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userName}? Cette action est irréversible.`, async () => {
        try {
            await api.deleteUser(userId);
            
            ui.showToast('Utilisateur supprimé avec succès', 'success');
            
            // Recharger les utilisateurs
            const users = await api.getUsers();
            userState.users = users;
            renderUsers();
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'utilisateur:', error);
            ui.showToast(error.message || 'Erreur lors de la suppression', 'error');
        }
    });
}

/**
 * Voir les emprunts d'un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @param {string} userName - Nom de l'utilisateur
 */
async function viewUserBorrows(userId, userName) {
    try {
        ui.setLoading('usersTable', true);
        
        // Récupérer les emprunts de l'utilisateur
        const borrows = await api.getUserBorrows(userId);
        
        // Créer une modale temporaire pour afficher les emprunts
        const modalId = 'userBorrowsModal';
        
        // Vérifier si la modale existe déjà
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2 id="userBorrowsTitle"></h2>
                    <div id="userBorrowsContainer"></div>
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
        const userBorrowsTitle = document.getElementById('userBorrowsTitle');
        const userBorrowsContainer = document.getElementById('userBorrowsContainer');
        
        userBorrowsTitle.textContent = `Emprunts de ${userName}`;
        
        // Afficher les emprunts
        if (borrows.length === 0) {
            userBorrowsContainer.innerHTML = '<p>Aucun emprunt pour cet utilisateur</p>';
        } else {
            userBorrowsContainer.innerHTML = '';
            
            // Créer un tableau pour afficher les emprunts
            const table = document.createElement('table');
            table.className = 'data-table';
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Livre</th>
                        <th>Date d'emprunt</th>
                        <th>Date de retour prévue</th>
                        <th>Date de retour</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tbody = table.querySelector('tbody');
            
            // Trier par date d'emprunt décroissante
            const sortedBorrows = [...borrows].sort(
                (a, b) => new Date(b.borrow_date) - new Date(a.borrow_date)
            );
            
            sortedBorrows.forEach(borrow => {
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
                    <td>${ui.formatDate(borrow.borrow_date)}</td>
                    <td>${ui.formatDate(borrow.expected_return_date)}</td>
                    <td>${borrow.return_date ? ui.formatDate(borrow.return_date) : '-'}</td>
                    <td><span class="borrow-status ${statusClass}">${status}</span></td>
                `;
                
                tbody.appendChild(tr);
            });
            
            userBorrowsContainer.appendChild(table);
        }
        
        // Ouvrir la modale
        ui.openModal(modalId);
    } catch (error) {
        console.error('Erreur lors de la récupération des emprunts:', error);
        ui.showToast('Erreur lors de la récupération des emprunts', 'error');
    } finally {
        ui.setLoading('usersTable', false);
    }
}

// Initialiser la page des statistiques
ui.onStatsPageLoad = async function() {
    if (!auth.isLoggedIn() || !auth.isAdmin()) {
        ui.showPage('login');
        return;
    }
    
    try {
        // Charger les statistiques des emprunts
        const borrowStats = await api.getBorrowStats();
        
        // Afficher les valeurs dans les cartes
        document.getElementById('totalBorrows').textContent = borrowStats.total;
        document.getElementById('activeBorrows').textContent = borrowStats.active;
        document.getElementById('overdueBorrows').textContent = borrowStats.overdue;
        
        // Nombre total de livres
        const books = await api.getBooks();
        document.getElementById('totalBooks').textContent = books.length;
        
        // Créer le graphique des livres les plus empruntés
        if (borrowStats.topBooks && borrowStats.topBooks.length > 0) {
            createTopBooksChart(borrowStats.topBooks);
        }
        
        // Charger les statistiques des catégories
        const categoryStats = await api.getCategoryStats();
        if (categoryStats && categoryStats.length > 0) {
            createCategoriesChart(categoryStats);
        }
        
        // Initialiser les gestionnaires d'événements pour les requêtes statistiques
        initStatsEventHandlers();
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        ui.showToast('Erreur lors du chargement des statistiques', 'error');
    }
};

/**
 * Initialiser les gestionnaires d'événements pour les requêtes statistiques
 */
function initStatsEventHandlers() {
    // Gestionnaire pour la requête des livres les plus empruntés par mois
    document.getElementById('queryTopBooks').addEventListener('click', async () => {
        const year = document.getElementById('statsYear').value;
        const month = document.getElementById('statsMonth').value;
        
        if (!year || !month) {
            ui.showToast('Veuillez sélectionner une année et un mois', 'warning');
            return;
        }
        
        try {
            // Conteneur des résultats
            const resultContainer = document.getElementById('topBooksResult');
            resultContainer.innerHTML = '<div class="loading">Chargement des données...</div>';
            
            // Récupérer les données
            const topBooks = await api.getTopBorrowedBooks(year, month);
            
            if (topBooks.length === 0) {
                resultContainer.innerHTML = '<p>Aucun livre emprunté pour cette période</p>';
                return;
            }
            
            // Créer un tableau pour afficher les résultats
            resultContainer.innerHTML = '';
            
            const table = document.createElement('table');
            table.className = 'data-table';
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Titre</th>
                        <th>Auteur</th>
                        <th>Nombre d'emprunts</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tbody = table.querySelector('tbody');
            
            topBooks.forEach(book => {
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.borrow_count}</td>
                `;
                
                tbody.appendChild(tr);
            });
            
            resultContainer.appendChild(table);
        } catch (error) {
            console.error('Erreur lors de la récupération des livres les plus empruntés:', error);
            ui.showToast('Erreur lors de la récupération des données', 'error');
        }
    });
}

/**
 * Créer le graphique des livres les plus empruntés
 * @param {Array} topBooks - Top 5 des livres les plus empruntés
 */
function createTopBooksChart(topBooks) {
    const ctx = document.getElementById('topBooksChart').getContext('2d');
    
    // Préparer les données
    const labels = topBooks.map(book => book.title);
    const data = topBooks.map(book => book.borrow_count);
    
    // Créer le graphique
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre d\'emprunts',
                data: data,
                backgroundColor: 'rgba(74, 111, 165, 0.7)',
                borderColor: 'rgba(74, 111, 165, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Créer le graphique des emprunts par catégorie
 * @param {Array} categoryStats - Statistiques des catégories
 */
function createCategoriesChart(categoryStats) {
    const ctx = document.getElementById('categoriesChart').getContext('2d');
    
    // Préparer les données
    const labels = categoryStats.map(cat => cat.name);
    const data = categoryStats.map(cat => cat.book_count);
    
    // Créer le graphique
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(74, 111, 165, 0.7)',
                    'rgba(231, 76, 60, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(243, 156, 18, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(52, 73, 94, 0.7)',
                    'rgba(26, 188, 156, 0.7)'
                ],
                borderColor: [
                    'rgba(74, 111, 165, 1)',
                    'rgba(231, 76, 60, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(243, 156, 18, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(52, 73, 94, 1)',
                    'rgba(26, 188, 156, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}