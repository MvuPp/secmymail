function toggleList(listId) {
    const lists = document.querySelectorAll('.list-container');
    lists.forEach(list => {
        if (list.id === listId + '-list') {
            list.style.display = list.style.display === 'block' ? 'none' : 'block';
        } else {
            list.style.display = 'none';
        }
    });
}
