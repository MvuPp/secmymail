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
    if (value && !stringList.includes(value)) {
        stringList.push(value);
        stringList.sort();
        updateList();
        saveToStorage();
    } else if (!value) {
        input.parentElement.remove();
    }
}

function deleteInput(inputWrapper, value) {
    inputWrapper.remove();
    stringList = stringList.filter(str => str !== value);
    saveToStorage();
}

function filterList() {
    const searchTerm = document.getElementById("searchBar").value.toLowerCase();
    const filteredList = stringList.filter(str => str.toLowerCase().includes(searchTerm));
    updateList(filteredList);
}

function updateList(list = stringList) {
    const container = document.getElementById("inputContainer");
    container.innerHTML = "";

    list.forEach(str => {
        const inputWrapper = document.createElement("div");
        inputWrapper.className = "input-wrapper";

        const input = document.createElement("input");
        input.type = "text";
        input.value = str;

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
        container.appendChild(inputWrapper);
    });
}

function loadFromFile() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".txt";
    fileInput.addEventListener("change", function() {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function() {
            stringList = reader.result.split("\n").map(str => str.trim()).filter(str => str);
            updateList();
            saveToStorage();
        };
        reader.readAsText(file);
    });
    fileInput.click();
}

function exportToFile() {
    const blob = new Blob([stringList.join("\n")], {type: "text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stringlist.txt";
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById("addButton").addEventListener("click", addNewInput);
document.getElementById("searchBar").addEventListener("input", filterList);
document.getElementById("load-file").addEventListener("click", loadFromFile);
document.getElementById("export").addEventListener("click", exportToFile);
