const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/

let scheduleRolldate;
let timerRolldate;

import {
    minusThresholdBtn,
    plusThresholdBtn,
    setDefaultThresholdBtn,
    radioTabParticipants,
    radioTabSchedule,
    radioTabTimer,
    contentContainer,
    ParticipantsContainer,
    slider,
    labelValue,
    scheduleContainer,
    timerContainer
} from './elements.js'

let currentTab;

const typeDict = {
    'participants': 'participants',
    'schedule': 'schedule',
    'timer': 'timer'
}

window.onload = async () => {
    const [tabs, storageSession, storageLocal] = await Promise.all([
        chrome.tabs.query({ active: true, currentWindow: true }),
        chrome.storage.session.get(['meet_bouncer']),
        chrome.storage.local.get(['mb_push_notifications', 'mb_default_tab', 'mb_default_threshold'])
    ]);

    currentTab = tabs[0];

    if (typeof storageSession !== undefined)
        await redrawActiveCalls(storageSession.meet_bouncer);

    if (storageLocal?.mb_default_tab !== undefined) {
        switch (storageLocal.mb_default_tab) {
            case 'tabParticipants':
                radioTabParticipants.checked = true;
                controlContainerTitle.innerHTML = "Participants Control";
                await drawParticipantsContainer();
                break;
            case 'tabSchedule':
                radioTabSchedule.checked = true;
                controlContainerTitle.innerHTML = "Schedule Control";
                drawScheduleContainer();
                break;
            case 'tabTimer':
                radioTabTimer.checked = true;
                controlContainerTitle.innerHTML = "Timer Control";
                drawTimerContainer();
                break;
        }
    }
    else {
        radioTabParticipants.checked = true;
        controlContainerTitle.innerHTML = "Participants Control";
        await drawParticipantsContainer();
        slider.value = storageLocal.mb_default_threshold ?? 5;
        updateSliderValue();
    }

    document.body.style.visibility = 'visible';

    if (storageLocal?.mb_default_threshold !== undefined)
        thresholdDefaultInput.value = storageLocal.mb_default_threshold;

    if (storageLocal?.mb_push_notifications !== undefined)
        notificationCheckbox.checked = storageLocal.mb_push_notifications;
}


function activateExtension() {
    if (tabParticipants.checked) {
        let threshold = document.getElementById('participants-slider').value;

        if (parseInt(threshold) > 0) {
            chrome.runtime.sendMessage({
                action: 'set_auto_leave',
                type: 'participants',
                threshold: threshold,
                tab: currentTab
            },
                (response) => {
                    if (!response)
                        console.log(chrome.runtime.lastError.message);
                }
            );
        }
    }
    else if (tabSchedule.checked) {
        let threshold = scheduleSetter.value;

        if (threshold) {
            chrome.runtime.sendMessage({
                action: 'set_auto_leave',
                type: 'schedule',
                threshold: threshold,
                tab: currentTab,
            },
                (response) => {
                    if (!response)
                        console.log(chrome.runtime.lastError.message);
                }
            );
        }
    }
    else if (tabTimer.checked) {
        let threshold = timerSetter.value;

        if (threshold) {
            let hoursMinutesAndSeconds = threshold.split(':');
            let hours = parseInt(hoursMinutesAndSeconds[0]);
            let minutes = parseInt(hoursMinutesAndSeconds[1]);
            let seconds = parseInt(hoursMinutesAndSeconds[2]);

            let thresholdTimeSeconds = (hours * 60 * 60 + minutes * 60 + seconds);

            chrome.runtime.sendMessage({
                action: 'set_auto_leave',
                type: 'timer',
                threshold: thresholdTimeSeconds,
                tab: currentTab,
            },
                (response) => {
                    if (!response)
                        console.log(chrome.runtime.lastError.message);
                }
            );
        }
    }
}

setButton.addEventListener('mouseover', function () {
    if (!meetRegex.test(currentTab.url) ||
        (tabSchedule.checked && !scheduleSetter.value) ||
        (tabTimer.checked && timerSetter.value === "00:00:00"))
        this.disabled = true;
    else
        this.disabled = false;
});


function resetExtension() {
    chrome.runtime.sendMessage({ action: 'reset_auto_leave', tab: currentTab },
        (response) => {
            if (!response)
                console.log(chrome.runtime.lastError.message);
        }
    );
}

resetButton.addEventListener('mouseover', function () {
    if (!meetRegex.test(currentTab.url))
        this.disabled = true;
    else
        this.disabled = false;
});


document.querySelectorAll('input[name="radioTab"]').forEach((elem) => {
    elem.addEventListener('change', function () {

        if (tabParticipants.checked) {
            controlContainerTitle.innerHTML = "Participants Control";
            drawParticipantsContainer();

            chrome.storage.local.set({ 'mb_default_tab': 'tabParticipants' });
        }
        else if (tabSchedule.checked) {
            controlContainerTitle.innerHTML = "Schedule Control";
            drawScheduleContainer();

            chrome.storage.local.set({ 'mb_default_tab': 'tabSchedule' });
        }
        else if (tabTimer.checked) {
            controlContainerTitle.innerHTML = "Timer Control";
            drawTimerContainer();

            chrome.storage.local.set({ 'mb_default_tab': 'tabTimer' });
        }
    });
});

async function drawParticipantsContainer() {
    const response = await new Promise((resolve) => {
        chrome.storage.local.get(['mb_default_threshold'],
            (response) => {
                resolve(response);
            });
    });
    slider.setAttribute('value', response.mb_default_threshold);
    labelValue.textContent = `Participants: ${response.mb_default_threshold}`;
    contentContainer.innerHTML = '';
    contentContainer.appendChild(ParticipantsContainer);
}

function drawScheduleContainer() {
    contentContainer.innerHTML = '';
    contentContainer.appendChild(scheduleContainer);

    if (typeof scheduleRolldate === "undefined") {
        scheduleRolldate = new Rolldate({
            el: '#scheduleSetter',
            format: 'hh:mm',
            lang: {
                hour: ' h',
                min: ' m'
            }
        });
    }
}

function drawTimerContainer() {
    contentContainer.innerHTML = '';
    contentContainer.appendChild(timerContainer);

    if (typeof timerRolldate === "undefined") {
        timerRolldate = new Rolldate({
            el: '#timerSetter',
            format: 'hh:mm:ss',
            value: '00:00:00',
            lang: {
                hour: ' h',
                min: ' m',
                sec: ' s'
            }
        });
    }
}

async function redrawActiveCalls(mbArray) {
    if (typeof mbArray === 'undefined' || mbArray.length === 0) {
        activeTabsList.innerHTML = "";
        addNoActiveCalls();
    } else {
        const fragment = document.createDocumentFragment();

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
            resolve);
    });

    let listItem = document.createElement('li');
    let threshold = item.threshold;

    if (item.type === "timer") {
        const countdownTime = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: "get_countdown_time",
                tab_id: item.target_id,
            }, resolve);
        });

        if (countdownTime !== null)
            threshold = secondsToTimeFormat(countdownTime);
        else
            threshold = secondsToTimeFormat(threshold);
    }

    listItem.innerHTML = `<span class="left-part">meet: ${item.target_url
        .match(codeRegex)[0]}</span><span class="right-part">${typeDict[item.type]}: ${threshold}</span>`;

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

function secondsToTimeFormat(seconds) {
    const pad = (num) => (num < 10 ? '0' : '') + num;

    if (seconds >= 3600) {
        // Format "hh:mm"
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return pad(hours) + ':' + pad(minutes);
    } else if (seconds < 60) {
        // Format "s"
        return seconds;
    } else if (seconds < 3600) {
        // Format "mm:ss"
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return pad(minutes) + ':' + pad(remainingSeconds);
    }
}


chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "redraw_active_tabs_list") {
        chrome.storage.session.get(['meet_bouncer']).then((res) => {
            if (typeof res !== 'undefined') {
                redrawActiveCalls(res.meet_bouncer);
            }
        });
    }
    else if (request.action === "redraw_timer") {
        let listItem = document.querySelectorAll(`[data-tabId="${request.tabId}"]`)
        listItem[0].innerHTML = `<span class="left-part">meet: ${request.tabUrl
            .match(codeRegex)[0]}</span>
            <span class="right-part">${typeDict.timer}: ${request.timeLeft}</span>`;
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

const moreInfoText = [
    "The extension's icon changes from green to orange when the Meet tab becomes " +
    "inactive, because the extension cannot work on inactive tabs.",
    "Paired with the volume control extension, this extension works even on inactive Meet tabs, " +
    "allowing you to browse the web freely without having to keep them open. " +
    "Just activate that extensions while on the Meet tab."
];

InfoButton.addEventListener('click', () => {
    if (InfoButton.innerHTML == "More info") {
        let fragment = document.createDocumentFragment();

        for (const itemText of moreInfoText) {
            let itemInfo = document.createElement('p');
            itemInfo.innerHTML = itemText;
            itemInfo.setAttribute('class', "more-info");
            fragment.appendChild(itemInfo);
        }

        infoContainer.appendChild(fragment);

        InfoButton.innerHTML = "Hide";
    }
    else {
        let elements = document.querySelectorAll('.more-info');

        for (const element of elements)
            element.remove();

        InfoButton.innerHTML = "More info";
    }
});

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