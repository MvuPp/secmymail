let stringList = [];
const template = findTemplate("stringlist.html");
const listName = template.getAttribute("id");

browser.storage.sync.get(listName).then(result => {
    if (result[listName]) {
        stringList = result[listName];
        updateList();
    }
});

function saveToStorage() {
    let data = {};
    data[listName] = stringList;
    browser.storage.sync.set(data);
}

function addNewInput() {
    const inputWrapper = document.createElement("div");
    inputWrapper.className = "input-wrapper";

    const input = document.createElement("input");
    input.type = "text";

    input.addEventListener("blur", function() {
        saveString(input);
    });

    input.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            input.blur();
        }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "×";
    deleteBtn.addEventListener("click", function() {
        deleteInput(inputWrapper, input.value);
    });

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(deleteBtn);
    document.getElementById("inputContainer").prepend(inputWrapper);
    input.focus();
}

function saveString(input) {
    const value = input.value.trim();
    const type = mailBtn.disabled ? "mail" : "domaine";
    if (value && !stringList.some(item => item.value === value)) {
        stringList.push({ value, type });
        stringList.sort((a, b) => a.value.localeCompare(b.value));
        updateList();
        saveToStorage();
    } else if (!value) {
        input.parentElement.remove();
    }
}

function deleteInput(inputWrapper, value) {
    inputWrapper.remove();
    stringList = stringList.filter(item => item.value !== value);
    saveToStorage();
}

function filterList() {
    const searchTerm = document.getElementById("searchBar").value.toLowerCase();
    const filteredList = stringList.filter(item => item.value.toLowerCase().includes(searchTerm));
    updateList(filteredList);
}

function updateList(list = stringList) {
    const container = document.getElementById("inputContainer");
    container.innerHTML = "";

    list.forEach(item => {
        const inputWrapper = document.createElement("div");
        inputWrapper.className = "input-wrapper";

        const input = document.createElement("input");
        input.type = "text";
        input.value = item.value;

        const typeDisplay = document.createElement("span");
        typeDisplay.className = "type-display";
        typeDisplay.innerText = item.type;

        input.addEventListener("blur", function() {
            saveString(input);
        });

        input.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                input.blur();
            }
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "×";
        deleteBtn.addEventListener("click", function() {
            deleteInput(inputWrapper, input.value);
        });

        inputWrapper.appendChild(input);
        inputWrapper.appendChild(typeDisplay);
        inputWrapper.appendChild(deleteBtn);
        container.appendChild(inputWrapper);
    });
}

document.getElementById("addButton").addEventListener("click", addNewInput);
document.getElementById("searchBar").addEventListener("input", filterList);

const mailBtn = document.getElementById("mailbtn");
const domaineBtn = document.getElementById("domainebtn");
const addButton = document.getElementById("addButton");

mailBtn.addEventListener("click", function() {
    addButton.disabled = false;
    mailBtn.disabled = true;
    domaineBtn.disabled = false;
});

domaineBtn.addEventListener("click", function() {
    addButton.disabled = false;
    domaineBtn.disabled = true;
    mailBtn.disabled = false;
});