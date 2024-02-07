let timerId;
let type;
let threshold;
let tab_id;
let tab_url;
let endCallButton;

chrome.storage.local.get(['mb_temp'], (res) => {
    if (typeof res['mb_temp'] === 'undefined')
        console.log("Something went wrong. The content script can't get the data.");

    let mb_temp = res['mb_temp'];
    tab_id = mb_temp.target_id;
    tab_url = mb_temp.target_url;
    type = mb_temp.type;
    threshold = mb_temp.threshold;

    chrome.storage.local.remove('mb_temp');

    startLogic();
});

function startLogic() {
    if (document.getElementsByClassName('uGOf1d').length <= 0) {
        alert("Please make sure you have already joined the room!");
        return;
    }
    chrome.runtime.sendMessage({
        action: 'extension_activation',
        type: type,
        threshold: threshold,
        tab_id: tab_id,
        tab_url: tab_url,
    });

    for (let i of document.getElementsByTagName('i')) {
        if (i.innerHTML == 'call_end')
            endCallButton = i;
    }

    endCallButton.addEventListener('click', () => {
        clearTimeout(timerId);

        console.log("User left the call");
        chrome.runtime.sendMessage({ action: 'check_close_meet', tab_id: tab_id });
    });

    setTimeout(() => {
        if (type === "participants") {
            executeInterval(participantsControl);
        } else if (type === "schedule") {
            executeInterval(scheduleControl);
        } else if (type === "timer") {
            timerControl();
        }
    }, 150);
}

function executeInterval(callback) {
    callback();
    timerId = setTimeout(() => { executeInterval(callback); }, 2000);
}

function participantsControl() {
    let numParticipantsElement = document.getElementsByClassName('uGOf1d')[0];
    if (typeof numParticipantsElement === "undefined")
        return;
    let numParticipants = parseInt(numParticipantsElement.innerHTML);
    console.log(`Threshold: ${threshold}\nCurrent participants: ${numParticipants}`);

    if (numParticipants < threshold) {
        console.log("Threshold met. User will now leave the google meet");

        endCallButton.click();
    }
}

function scheduleControl() {
    let currentTime = new Date();
    let currentHours = currentTime.getHours();
    let currentMinutes = currentTime.getMinutes();

    currentHours = currentHours < 10 ? '0' + currentHours : currentHours;
    currentMinutes = currentMinutes < 10 ? '0' + currentMinutes : currentMinutes;
    let currentTimeString = currentHours + ':' + currentMinutes;

    if (currentTimeString === threshold) {
        console.log("Threshold met. User will now leave the google meet");

        endCallButton.click();
    }
}

function timerControl() {
    chrome.runtime.sendMessage({
        action: 'set_timer',
        tab_id: tab_id,
        tab_url: tab_url,
        time: threshold
    });

    timerId = setTimeout(() => {
        console.log("Threshold met. User will now leave the google meet");

        endCallButton.click();
    }, threshold * 1000)
}


document.addEventListener("visibilitychange", () => {
    chrome.runtime.sendMessage({ action: 'check_tabs_visibility' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "check_visibility") {
        const isVisible = document.visibilityState === "visible";
        sendResponse({ isVisible: isVisible });
    }
    else if (request.action === "change_threshold") {
        if (type === "timer")
            chrome.runtime.sendMessage({ action: "stop_timer", tab_id: tab_id });

        clearTimeout(timerId);

        type = request.type;
        threshold = request.threshold;
        chrome.runtime.sendMessage({
            action: 'set_badge',
            threshold: threshold,
            tab_id: tab_id
        });

        startLogic();
        chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
        console.log("Threshold changed");
    }
    else if (request.action === "reset_extension") {
        if (document.getElementsByClassName('uGOf1d').length <= 0) {
            alert("Please make sure you have already joined the room!");
            return;
        }
        clearTimeout(timerId);

        chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
        console.log("Extension reset on this tab");
    }
    else if (request.action === "activate_extension") {
        sendResponse(true);
        type = request.type;
        threshold = request.threshold;

        startLogic();
        chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
        console.log("Extension activated on this tab");
    }
});