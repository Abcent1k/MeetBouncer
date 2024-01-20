var isPaused = false;
var threshold;
var tab_id;
var tab_url;

chrome.storage.local.get(['mb_temp'], (res) => {
    if (typeof res['mb_temp'] === 'undefined')
        console.log("Something went wrong. The content script can't get the data.");

    let mb_temp = res['mb_temp'];
    tab_id = mb_temp.target_id;
    tab_url = mb_temp.target_url;
    threshold = mb_temp.threshold;

    chrome.storage.local.remove('mb_temp');

    if (document.getElementsByClassName('uGOf1d').length <= 0) {
        alert("Please make sure you have already joined the room!");
    }
    else {

        chrome.runtime.sendMessage({
            action: 'extension_activation',
            threshold: threshold,
            tab_id: tab_id
        });

        let intervalId = setInterval(() => {
            if (!isPaused) {
                let numParticipantsElement = document.getElementsByClassName('uGOf1d')[0];
                if (typeof numParticipantsElement === "undefined")
                    return;
                let numParticipants = parseInt(numParticipantsElement.innerHTML);
                console.log(`Threshold: ${threshold}\nCurrent participants: ${numParticipants}`);

                if (numParticipants <= threshold) {
                    console.log("Threshold met. User will now leave the google meet");

                    for (let i of document.getElementsByTagName('i')) {
                        if (i.innerHTML == 'call_end')
                            i.click();
                    }
                    console.log("User left the call");
                    chrome.runtime.sendMessage({ action: 'check_close_meet', tab_id: tab_id });

                    clearInterval(intervalId);
                }
            }
        }, 5000);
    }
});


document.addEventListener("visibilitychange", () => {
    chrome.runtime.sendMessage({ action: 'check_tabs_visibility' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "check_visibility") {
        const isVisible = document.visibilityState === "visible";
        sendResponse({ isVisible: isVisible });
    }
    else if (request.action === "change_threshold") {
        threshold = request.threshold;
        chrome.runtime.sendMessage({
            action: 'set_badge',
            threshold: threshold,
            tab_id: tab_id
        });
        chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
        console.log("Threshold changed");
    }
    else if (request.action === "reset_extension") {
        isPaused = true;
        chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
        console.log("Extension reset on this tab");
    }
    else if (request.action === "activate_extension") {
        isPaused = false;
        chrome.runtime.sendMessage({
            action: 'extension_activation',
            threshold: threshold,
            tab_id: tab_id
        });
        chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
        console.log("Extension activated on this tab");
        sendResponse(true);
    }
});