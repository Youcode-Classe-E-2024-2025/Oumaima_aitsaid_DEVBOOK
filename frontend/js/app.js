/**
 * Point d'entrée principal de l'application
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser l'interface utilisateur
    ui.init();
    
    // Vérifier si l'utilisateur est déjà connecté
    const isLoggedIn = await auth.checkToken();
    
    // Mettre à jour le menu selon l'utilisateur
    ui.updateMenuForUser();
    
    // Afficher la page initiale
    if (isLoggedIn) {
        // Rediriger vers la page des livres si connecté
        ui.showPage('books');
        
        // Mettre en surbrillance le lien actif
        const activeLink = document.querySelector(`.sidebar-menu a[data-page="books"]`);
        if (activeLink) {
            document.querySelectorAll('.sidebar-menu a').forEach(a => {
                a.classList.remove('active');
            });
            activeLink.classList.add('active');
        }
    } else {
        // Rediriger vers la page de connexion si non connecté
        ui.showPage('login');
    }
    
    // Initialiser les gestionnaires d'événements pour l'authentification
    initAuthHandlers();
});

/**
 * Initialise les gestionnaires pour l'authentification
 */
function initAuthHandlers() {
    // Gestionnaire du formulaire de connexion
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginMessage.textContent = '';
        loginMessage.className = 'form-message';
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            ui.showToast('Connexion en cours...', 'info');
            await auth.login(email, password);
            ui.updateMenuForUser();
            ui.showPage('books');
            ui.showToast('Connexion réussie!', 'success');
        } catch (error) {
            loginMessage.textContent = error.message || 'Erreur de connexion';
            loginMessage.classList.add('error');
            ui.showToast('Erreur de connexion', 'error');
        }
    });
    
    // Gestionnaire du formulaire d'inscription
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerMessage.textContent = '';
        registerMessage.className = 'form-message';
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        // Validation côté client
        if (password !== passwordConfirm) {
            registerMessage.textContent = 'Les mots de passe ne correspondent pas';
            registerMessage.classList.add('error');
            return;
        }
        
        try {
            ui.showToast('Inscription en cours...', 'info');
            await auth.register(name, email, password);
            ui.updateMenuForUser();
            ui.showPage('books');
            ui.showToast('Inscription réussie!', 'success');
        } catch (error) {
            registerMessage.textContent = error.message || 'Erreur d\'inscription';
            registerMessage.classList.add('error');
            ui.showToast('Erreur d\'inscription', 'error');
        }
    });
    
    // Gestionnaire du formulaire de profil
    const profileForm = document.getElementById('profileForm');
    const profileMessage = document.getElementById('profileMessage');
    
    // Action lorsque la page de profil est chargée
    ui.onProfilePageLoad = function() {
        if (!auth.isLoggedIn()) {
            ui.showPage('login');
            return;
        }
        
        // Remplir le formulaire avec les informations utilisateur
        document.getElementById('profileName').value = auth.user.name;
        document.getElementById('profileEmail').value = auth.user.email;
        document.getElementById('profilePassword').value = '';
        document.getElementById('profilePasswordConfirm').value = '';
    };
    
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        profileMessage.textContent = '';
        profileMessage.className = 'form-message';
        
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const password = document.getElementById('profilePassword').value;
        const passwordConfirm = document.getElementById('profilePasswordConfirm').value;
        
        // Validation du mot de passe
        if (password && password !== passwordConfirm) {
            profileMessage.textContent = 'Les mots de passe ne correspondent pas';
            profileMessage.classList.add('error');
            return;
        }
        
        try {
            ui.showToast('Mise à jour du profil...', 'info');
            
            // Préparer les données à mettre à jour
            const userData = { name, email };
            if (password) {
                userData.password = password;
            }
            
            await auth.updateProfile(userData);
            
            profileMessage.textContent = 'Profil mis à jour avec succès';
            profileMessage.classList.add('success');
            ui.showToast('Profil mis à jour!', 'success');
        } catch (error) {
            profileMessage.textContent = error.message || 'Erreur de mise à jour du profil';
            profileMessage.classList.add('error');
            ui.showToast('Erreur de mise à jour du profil', 'error');
        }
    });
}