const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/

const slider = document.getElementById('participants-slider');
const minusThresholdBtn = document.getElementById("minusThresholdButton");
const plusThresholdBtn = document.getElementById("plusThresholdButton");
const setDefaultThresholdBtn = document.getElementById("setThresholdButton");
let currentTab;

window.onload = () => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        currentTab = tabs[0];
    });
    chrome.storage.session.get(['meet_bouncer']).then((res) => {
        if (typeof res !== 'undefined')
            redrawActiveCalls(res.meet_bouncer);
    });
    chrome.storage.local.get([
        'mb_default_threshold',
        'mb_push_notifications']
    ).then((res) => {
        if (typeof res?.mb_default_threshold !== 'undefined') {
            slider.value = res.mb_default_threshold;
            thresholdDefaultInput.value = res.mb_default_threshold;
        }
        updateSliderValue();
        if (typeof res?.mb_push_notifications !== 'undefined' &&
            res.mb_push_notifications === false)
            notificationCheckbox.checked = false;
        else
            notificationCheckbox.checked = true;
    });
}

function activateExtension() {
    let threshold = document.getElementById('participants-slider').value;
    if (parseInt(threshold) > 0) {
        chrome.runtime.sendMessage(
            { action: 'set_auto_leave', threshold: threshold, tab: currentTab },
            (response) => {
                if (!response)
                    console.log(chrome.runtime.lastError.message)

                else if (response === "wrong tab")
                    alert("Please make sure you are on the google meet tab!");
            }
        );
    }
}

function resetExtension() {
    chrome.runtime.sendMessage({ action: 'reset_auto_leave', tab: currentTab },
        (response) => {
            if (!response)
                console.log(chrome.runtime.lastError.message)

            else if (response === "wrong tab") {
                alert("Please make sure you are on the google meet tab!");
                //Maybe change the style of the button?
            }
        }
    );
}

async function redrawActiveCalls(mbArray) {
    if (typeof mbArray === 'undefined' || mbArray.length === 0) {
        activeTabsList.innerHTML = "";
        addNoActiveCalls();
    } else {
        const fragment = document.createDocumentFragment();

        mbArray.sort((a, b) => (parseInt(a.target_id) - parseInt(b.target_id)));

        for (const item of mbArray) {
            const listItem = await createListItem(item);
            fragment.appendChild(listItem);
        }
        activeTabsList.innerHTML = "";
        activeTabsList.appendChild(fragment);
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
    listItem.innerHTML = `<span class="left-part">meet.google.com/${item.target_url
        .match(codeRegex)[0]}</span><span class="right-part">lim: ${item.threshold}</span>`;

    if (!response.isVisible)
        listItem.className = "orange";

    listItem.style.cursor = 'pointer';
    listItem.setAttribute('data-tabId', item.target_id);

    listItem.addEventListener('click', () => {
        let tabId = parseInt(listItem.getAttribute('data-tabId'));
        chrome.tabs.update(tabId, { active: true });
    });

    return listItem;
}

function addNoActiveCalls() {
    let listItem = document.createElement('li');
    listItem.innerHTML = `No active calls`;
    activeTabsList.appendChild(listItem);
}


chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "redraw_active_tabs_list") {
        chrome.storage.session.get(['meet_bouncer']).then((res) => {
            if (typeof res !== 'undefined') {
                redrawActiveCalls(res.meet_bouncer);
            }
        });
    }
});


function updateSliderValue() {
    sliderValue.textContent = `Participants: ${slider.value}`;
}

function minusThreshold() {
    let currentThreshold = parseInt(thresholdDefaultInput.value);

    if (currentThreshold <= 1)
        thresholdDefaultInput.value = 1;
    else if (currentThreshold > 100)
        thresholdDefaultInput.value = 100;
    else if (currentThreshold <= 100)
        thresholdDefaultInput.value = parseInt(currentThreshold) - 1;
}

function plusThreshold() {
    let currentThreshold = parseInt(thresholdDefaultInput.value);

    if (currentThreshold < 1)
        thresholdDefaultInput.value = 1;
    else if (currentThreshold >= 100)
        thresholdDefaultInput.value = 100;
    else if (currentThreshold < 100)
        thresholdDefaultInput.value = parseInt(currentThreshold) + 1;
}

function setDefaultThreshold() {
    let thresholdDefault = thresholdDefaultInput.value;
    if (thresholdDefault >= 1 && thresholdDefault <= 100) {
        chrome.storage.local.set({ 'mb_default_threshold': thresholdDefault });
        slider.value = thresholdDefault;
        updateSliderValue();
    }
}

settingsButton.addEventListener('click', () => { modal.style.display = "block"; });

window.addEventListener('click', (event) => {
    if (event.target == modal)
        modal.style.display = "none";
});

notificationCheckbox.addEventListener('click', () => {
    chrome.storage.local.set({ 'mb_push_notifications': notificationCheckbox.checked });
    chrome.runtime.sendMessage({ action: 'check_tabs_visibility' });
});

slider.addEventListener('input', updateSliderValue);
minusThresholdBtn.addEventListener('click', minusThreshold);
plusThresholdBtn.addEventListener('click', plusThreshold);
setDefaultThresholdBtn.addEventListener('click', setDefaultThreshold);
setButton.addEventListener('click', activateExtension);
resetButton.addEventListener('click', resetExtension);