const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
const setButton = document.getElementById('setButton');
const resetButton = document.getElementById('resetButton');
const tabContainer = document.getElementById("active_tabs_list")

window.onload = function () {
    chrome.storage.session.get(['meet-bouncer'], (res) => {
        if (typeof res !== 'undefined')
            redrawActiveCalls(res['meet-bouncer']);

        updateSliderValue();
    })
}

function activateExtension() {
    let threshold = document.getElementById('participants-slider').value;
    if (parseInt(threshold) > 0) {
        chrome.runtime.sendMessage({ action: 'set-auto-leave', threshold: threshold }, (response) => {
            if (!response)
                console.log(chrome.runtime.lastError.message)

            else if (response === "wrong tab")
                alert("Please make sure you are on the google meet tab!")
        });
    }
}

function resetExtension() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
        chrome.runtime.sendMessage({ action: 'check_close_meet', tab_id: tab[0].id }, (response) => {
            if (!response)
                return;

            chrome.tabs.sendMessage(tab[0].id, { action: "reset_extension" });
        });
    });
}

async function redrawActiveCalls(mbArray) {
    if (typeof mbArray === 'undefined' || mbArray.length === 0) {
        tabContainer.innerHTML = "";
        addNoActiveCalls();
    } else {
        const fragment = document.createDocumentFragment();

        mbArray.sort((a, b) => (parseInt(a.target_id) - parseInt(b.target_id)));

        for (const item of mbArray) {
            const listItem = await createListItem(item);
            fragment.appendChild(listItem);
        }
        tabContainer.innerHTML = "";
        tabContainer.appendChild(fragment);
    }
}

async function createListItem(item) {
    const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(
            item.target_id,
            { action: "check_visibility" },
            (response) => {
                resolve(response);
            }
        );
    });

    let listItem = document.createElement('li');
    listItem.innerHTML = `<span class="left-part">meet.google.com/${item['target_url']
        .match(codeRegex)[0]}</span><span class="right-part">lim: ${item['threshold']}</span>`;

    if (!response.isVisible)
        listItem.className = "orange";

    listItem.style.cursor = 'pointer';
    listItem.setAttribute('data-tabId', item["target_id"]);

    listItem.addEventListener('click', () => {
        let tabId = parseInt(listItem.getAttribute('data-tabId'));
        chrome.tabs.update(tabId, { active: true });
    });

    return listItem;
}

function addNoActiveCalls() {
    let listItem = document.createElement('li');
    listItem.innerHTML = `No active calls`;
    document.querySelector('#active_tabs_list').appendChild(listItem);
}

const slider = document.getElementById('participants-slider');
const sliderValueDisplay = document.querySelector('.slider-value');

function updateSliderValue() {
    sliderValueDisplay.textContent = `Participants: ${slider.value}`;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "redraw_active_tabs_list") {
        chrome.storage.session.get(['meet-bouncer'], function (res) {
            if (typeof res !== 'undefined') {
                redrawActiveCalls(res['meet-bouncer']);
            }
        })
    }
})

slider.addEventListener('input', updateSliderValue);
setButton.addEventListener('click', activateExtension);
resetButton.addEventListener('click', resetExtension);