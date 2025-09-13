// Sistema de Autenticación para Stockeando
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Verificar autenticación al cargar la página
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
        } else {
            this.addLogoutButton();
        }
    }

    isAuthenticated() {
        const session = localStorage.getItem('stockeando_session');
        return session === 'authenticated';
    }

    redirectToLogin() {
        // Solo redirigir si no estamos ya en la página de login
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    logout() {
        localStorage.removeItem('stockeando_session');
        localStorage.removeItem('stockeando_user');
        window.location.href = 'login.html';
    }

    getCurrentUser() {
        return localStorage.getItem('stockeando_user') || 'Usuario';
    }

    addLogoutButton() {
        // Buscar la navegación principal
        const nav = document.querySelector('.main-nav');
        if (nav) {
            // Crear botón de logout
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.className = 'nav-link';
            logoutBtn.style.marginLeft = 'auto';
            logoutBtn.innerHTML = `👤 ${this.getCurrentUser()} | Salir`;
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm('¿Está seguro que desea cerrar sesión?')) {
                    this.logout();
                }
            };
            
            nav.appendChild(logoutBtn);
        }
    }
}

// Inicializar autenticación cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    new AuthManager();
});