/**
 * Initialise les boutons radio et leur état en fonction des données stockées.
 */
document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('.radioButton');

    // Récupérer l'objet folderActive depuis le localStorage
    const storedTagStates = JSON.parse(localStorage.getItem('etatBalises')) || {};

    radioButtons.forEach(button => {
        if (storedTagStates[button.name]?.active) {
            button.classList.add('active');
            button.style.backgroundColor = 'green';
        } else {
            button.classList.remove('active');
            button.style.backgroundColor = 'red';
        }

        button.addEventListener('click', (event) => {
            const button = event.target;
            const isActive = button.classList.toggle('active');

            button.style.backgroundColor = isActive ? 'green' : 'red';

            const storedFolderActive = JSON.parse(localStorage.getItem('etatBalises')) || {};
            storedFolderActive[button.name] = { active: isActive };
            localStorage.setItem('etatBalises', JSON.stringify(storedFolderActive));
        });
    });
});