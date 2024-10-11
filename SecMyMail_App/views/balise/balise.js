document.getElementById('add-tag-btn').addEventListener('click', function() {
    // Fonction pour générer une couleur hexadécimale aléatoire
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Créer un nouvel élément de balise
    const newTag = document.createElement('div');
    newTag.className = 'tag-item';
    newTag.innerHTML = `
        <div class="tag-color" style="background-color: ${getRandomColor()};"></div>
        <span class="tag-text">Nouvelle Balise</span>
        <button class="delete-tag-btn">
            <span class="delete-icon">-</span>
        </button>
    `;

    // Ajouter le nouvel élément à la liste des balises
    document.querySelector('.tag-list').appendChild(newTag);

    // Ajouter un événement de suppression pour le nouveau bouton
    newTag.querySelector('.delete-tag-btn').addEventListener('click', function() {
        this.parentElement.remove();
    });
});

// Ajouter un événement de suppression pour les boutons existants
document.querySelectorAll('.delete-tag-btn').forEach(button => {
    button.addEventListener('click', function() {
        this.parentElement.remove();
    });
});