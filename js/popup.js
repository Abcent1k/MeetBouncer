const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/;
const codeRegex = /\w{3}-\w{4}-\w{3}/;
const notificationId = "1";

let scheduleRolldate;
let timerRolldate;

let mb_max_threshold;

import {
    minusThresholdBtn,
    plusThresholdBtn,
    setDefaultThresholdBtn,
    radioTabParticipants,
    radioTabSchedule,
    radioTabTimer,
    contentContainer,
    participantsContainer,
    scheduleContainer,
    timerContainer,
    slider,
    labelValue,
    labelMax,
    scheduleSetter,
    timerSetter
} from './elements.js'

let currentTab;

const typeDict = {
    'participants': 'participants',
    'schedule': 'schedule',
    'timer': 'timer'
}

window.onload = async () => {
    try {
        const [tabs, storageSession, storageLocal] = await Promise.all([
            chrome.tabs.query({ active: true, currentWindow: true }),
            chrome.storage.session.get(['meet_bouncer']),
            chrome.storage.local.get(['mb_push_notifications', 'mb_default_tab'])
        ]);

        currentTab = tabs[0];

        if (storageSession !== undefined)
            await redrawActiveCalls(storageSession.meet_bouncer);

        switch (storageLocal?.mb_default_tab ?? 'tabParticipants') {
            case 'tabSchedule':
                radioTabSchedule.checked = true;
                controlContainerTitle.textContent = "Schedule Control";
                await drawScheduleContainer();
                break;
            case 'tabTimer':
                radioTabTimer.checked = true;
                controlContainerTitle.textContent = "Timer Control";
                await drawTimerContainer();
                break;
            case 'tabParticipants':
            default:
                radioTabParticipants.checked = true;
                controlContainerTitle.textContent = "Participants Control";
                await drawParticipantsContainer();
                break;
        }
        if (storageLocal?.mb_push_notifications !== 'undefined')
            notificationCheckbox.checked = storageLocal.mb_push_notifications;

    } catch (error) {
        console.error('Error during extension initialization:', error);
    } finally {
        document.body.style.visibility = 'visible';
    }

    try {
        await redrawSettingsContainer();
    } catch (error) {
        console.error('Error when rendering settings:', error);
    }
}


async function redrawSettingsContainer() {
    const [storageLocal] = await Promise.all([
        chrome.storage.local.get(['mb_max_threshold', 'mb_default_threshold'])
    ]);

    mb_max_threshold = storageLocal?.mb_max_threshold;

    thresholdDefaultInput.setAttribute('max', mb_max_threshold ?? 50);
    inputMaxSlider.setAttribute('max', mb_max_threshold ?? 50);
    thresholdDefaultInput.value = storageLocal?.mb_default_threshold ?? 5;
}

function activateExtension() {
    if (tabParticipants.checked) {
        let threshold = slider.value;

        if (parseInt(threshold) > 0)
            setAutoLeave('participants', threshold, currentTab);
    }
    else if (tabSchedule.checked) {
        let threshold = scheduleSetter.value;

        if (threshold)
            setAutoLeave('schedule', threshold, currentTab);
    }
    else if (tabTimer.checked) {
        let threshold = timerSetter.value;

        if (threshold) {
            let hoursMinutesAndSeconds = threshold.split(':');
            let hours = parseInt(hoursMinutesAndSeconds[0]);
            let minutes = parseInt(hoursMinutesAndSeconds[1]);
            let seconds = parseInt(hoursMinutesAndSeconds[2]);

            let thresholdTimeSeconds = (hours * 60 * 60 + minutes * 60 + seconds);

            setAutoLeave('timer', thresholdTimeSeconds, currentTab);
        }
    }
}

function setAutoLeave(type, threshold, tab) {
    chrome.runtime.sendMessage({
        action: 'set_auto_leave',
        type: type,
        threshold: threshold,
        tab: tab,
    },
        (response) => {
            if (!response)
                console.log(chrome.runtime.lastError.message);
        }
    );
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
            controlContainerTitle.textContent = "Participants Control";
            drawParticipantsContainer();

            chrome.storage.local.set({ 'mb_default_tab': 'tabParticipants' });
        }
        else if (tabSchedule.checked) {
            controlContainerTitle.textContent = "Schedule Control";
            drawScheduleContainer();

            chrome.storage.local.set({ 'mb_default_tab': 'tabSchedule' });
        }
        else if (tabTimer.checked) {
            controlContainerTitle.textContent = "Timer Control";
            drawTimerContainer();

            chrome.storage.local.set({ 'mb_default_tab': 'tabTimer' });
        }
    });
});

async function drawParticipantsContainer() {
    const response = await new Promise((resolve) => {
        chrome.storage.local.get(['mb_default_threshold', 'mb_max_threshold'],
            (response) => {
                resolve(response);
            });
    });

    slider.setAttribute('value', response.mb_default_threshold ?? 5);
    slider.setAttribute('max', response.mb_max_threshold ?? 50);

    labelValue.textContent = `Participants: ${slider.value}`;
    labelMax.textContent = slider.max;

    contentContainer.textContent = '';
    contentContainer.appendChild(participantsContainer);
}

function drawScheduleContainer() {
    contentContainer.textContent = '';
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
    contentContainer.textContent = '';
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
        activeTabsList.textContent = '';
        addNoActiveCalls();
    } else {
        const fragment = document.createDocumentFragment();

        for (const item of mbArray) {
            const listItem = await createListItem(item);
            fragment.appendChild(listItem);
        }
        activeTabsList.textContent = '';
        activeTabsList.appendChild(fragment);
    }
}

async function createListItem(item) {
    let listItem = document.createElement('li');
    let threshold = item.threshold;

    if (item.type === "timer") {
        const countdownTime = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: "get_countdown_time",
                tab_id: item.target_id,
            }, resolve);
        });

        threshold = secondsToTimeFormat(countdownTime ?? threshold, "hh:mm:ss");
    }

    const spanLeft = document.createElement('span');
    spanLeft.classList.add('left-part');
    spanLeft.textContent = `meet: ${item.target_url.match(codeRegex)[0]}`;
    listItem.appendChild(spanLeft);

    const spanRight = document.createElement('span');
    spanRight.classList.add('right-part');
    spanRight.textContent = `${typeDict[item.type]}: ${threshold}`;
    listItem.appendChild(spanRight);

    if (item.type === "participants") {
        try {
            const isVisible = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(item.target_id, { action: "check_visibility" }, (response) => {
                    if (chrome.runtime.lastError)
                        reject(chrome.runtime.lastError.message);
                    else
                        resolve(response?.isVisible);
                });
            });

            if (!isVisible)
                listItem.className = "orange";
        }
        catch (error) {
            console.log("Error when checking that tabs are active: ", error);
        }
    }

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
    listItem.textContent = 'No active calls';
    activeTabsList.appendChild(listItem);
}

function secondsToTimeFormat(seconds, format) {
    const pad = (num) => (num < 10 ? '0' : '') + num;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor((seconds % 3600) % 60);

    switch (true) {
        case format === "hh:mm:ss" && seconds >= 3600:
            return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
        case format === "hh:mm" && seconds >= 3600:
            return `${pad(hours)}:${pad(minutes)}`;
        case seconds < 3600 && seconds >= 60:
            return `${pad(minutes)}:${pad(remainingSeconds)}`;
        case seconds < 60:
            return `${seconds}`;
        default:
            return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
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
        let listItem = document.querySelector(`[data-tabId="${request.tabId}"]`);
        if (listItem) {
            while (listItem.firstChild) {
                listItem.removeChild(listItem.firstChild);
            }

            const spanLeft = document.createElement('span');
            spanLeft.classList.add('left-part');
            spanLeft.textContent = `meet: ${request.tabUrl.match(codeRegex)[0]}`;
            listItem.appendChild(spanLeft);

            const spanRight = document.createElement('span');
            spanRight.classList.add('right-part');
            spanRight.textContent = `${typeDict.timer}: ${request.timeLeft}`;
            listItem.appendChild(spanRight);
        }
    }
});


function updateSliderValue() {
    sliderValue.textContent = `Participants: ${slider.value}`;
}

function minusBttn(InputField, maxValue) {
    let currentValue = parseInt(InputField.value);

    if (currentValue <= 1)
        InputField.value = 1;
    else if (currentValue > maxValue)
        InputField.value = maxValue;
    else if (currentValue <= maxValue)
        InputField.value = parseInt(currentValue) - 1;
}

function plusBttn(InputField, maxValue) {
    let currentValue = parseInt(InputField.value);

    if (currentValue < 1)
        InputField.value = 1;
    else if (currentValue >= maxValue)
        InputField.value = maxValue;
    else if (currentValue < maxValue)
        InputField.value = parseInt(currentValue) + 1;
}

function setValue(InputField, maxValue, storageLocalParameter, callback) {
    let valueDefault = InputField.value;
    if (valueDefault >= 1 && valueDefault <= maxValue) {
        chrome.storage.local.set({ [storageLocalParameter]: valueDefault });
        callback(valueDefault);
    }
}

function updateSlider(mb_default_thr) {
    slider.value = mb_default_thr ?? 5;
    updateSliderValue();
}

function updateMaxSlider(mb_max_thr) {
    slider.setAttribute('max', mb_max_thr ?? 50);
    labelMax.textContent = mb_max_thr ?? 50;

    mb_max_threshold = mb_max_thr ?? 50;
}

const moreInfoText = [
    "If the Meet tab is minimized in participants threshold mode, the extension won't work, signaled by the icon turning orange.",
    "Paired with the volume control extension, this extension works even on inactive Meet tabs, allowing you to browse the web freely without having to keep them open. Just activate that extensions while on the Meet tab."
];

InfoButton.addEventListener('click', () => {
    if (InfoButton.textContent == "More info") {
        let fragment = document.createDocumentFragment();

        for (const itemText of moreInfoText) {
            let itemInfo = document.createElement('p');
            itemInfo.textContent = itemText;
            itemInfo.setAttribute('class', "more-info");
            fragment.appendChild(itemInfo);
        }

        infoContainer.appendChild(fragment);

        InfoButton.textContent = "Hide";
    }
    else {
        let elements = document.querySelectorAll('.more-info');

        for (const element of elements)
            element.remove();

        InfoButton.textContent = "More info";
    }

});

settingsButton.addEventListener('click', () => { modal.style.display = "block"; });

window.addEventListener('click', (event) => {
    if (event.target == modal)
        modal.style.display = "none";
});

notificationCheckbox.addEventListener('click', () => {
    chrome.storage.local.set({ 'mb_push_notifications': notificationCheckbox.checked });
    if (notificationCheckbox.checked) {
        chrome.runtime.sendMessage({ action: 'check_tabs_visibility' });
    }
    else {
        chrome.notifications.clear(notificationId, (response) => {
            if (response)
                console.log('Notification deleted');
        });
    }
});

slider.addEventListener('input', updateSliderValue);
minusThresholdBtn.addEventListener('click', () => minusBttn(thresholdDefaultInput, mb_max_threshold));
plusThresholdBtn.addEventListener('click', () => plusBttn(thresholdDefaultInput, mb_max_threshold));
setDefaultThresholdBtn.addEventListener('click', () => setValue(
    thresholdDefaultInput,
    mb_max_threshold,
    'mb_default_threshold',
    updateSlider));

minusMaxSliderButton.addEventListener('click', () => minusBttn(inputMaxSlider, 100));
plusMaxSliderButton.addEventListener('click', () => plusBttn(inputMaxSlider, 100));
setMaxSliderButton.addEventListener('click', () => setValue(
    inputMaxSlider,
    100,
    'mb_max_threshold',
    updateMaxSlider));

setButton.addEventListener('click', activateExtension);
resetButton.addEventListener('click', resetExtension);