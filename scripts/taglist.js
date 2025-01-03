import { tagsData } from '../modules/tags.js';

const taglistTbody = document.querySelector('#taglist tbody');

async function initTaglist() {

    const tags = await browser.messages.tags.list();
    const tagDict = Object.fromEntries(tags.map(tag => [tag.key, tag]));

    for (let [key, data] of Object.entries(tagsData)) {
        const tagName = data.tag;
        const tagColor = tagDict[key] ? tagDict[key].color : data.default_color;

        const tr = document.createElement('tr');
        tr.classList.add('taglist-item');

        const tdName = document.createElement('td');
        tdName.textContent = tagName;

        const tdColor = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'color';
        input.value = tagColor;
        input.addEventListener('change', async (event) => {
            console.log(`Updating tag ${tagName} color to ${event.target.value}`);
            await browser.messages.tags.update(key, { color: event.target.value });
        });
        tdColor.appendChild(input);

        tr.appendChild(tdName);
        tr.appendChild(tdColor);
        taglistTbody.appendChild(tr);
    }
}

initTaglist();
