/**
 * Module de navigation commun
 */
class NavigationManager {
  constructor() {
    this.setupGlobalListeners();
  }

  setupGlobalListeners() {
    // Gestion des boutons de retour universels
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('back-button')) {
        this.goBack();
      }
      
      if (event.target.classList.contains('home-button')) {
        this.goHome();
      }
    });

    // Navigation au clavier
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.goBack();
      }
      
      if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        this.goHome();
      }
    });
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.goHome();
    }
  }

  goHome() {
    window.location.href = 'popup.html';
  }

  navigateTo(page) {
    window.location.href = page;
  }
}

// Instance globale
const navigation = new NavigationManager();

export { navigation };