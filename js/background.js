const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/;
const codeRegex = /\w{3}-\w{4}-\w{3}/;
const notificationId = "1";
let intervalTabIdDict = {};

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        'mb_default_threshold': 5,
        'mb_default_tab': 'tabParticipants',
        'mb_push_notifications': true,
    })
})

function setIcon(activeFlag) {
    if (activeFlag == "active") {
        chrome.action.setIcon({
            path: {
                "16": "../img/mb-active-16.png",
                "48": "../img/mb-active-48.png"
            }
        });
    }
    else if (activeFlag == "inactive") {
        chrome.action.setIcon({
            path: {
                "16": "../img/mb-inactive-16.png",
                "48": "../img/mb-inactive-48.png"
            }
        });
    }
    else if (activeFlag == "disabled") {
        chrome.action.setIcon({
            path: {
                "16": "../img/mb-disabled-16.png",
                "48": "../img/mb-disabled-48.png"
            }
        });
    }
}

async function messageListener(request, sender, sendResponse) {
    if (request.action === 'set_auto_leave') {
        let meetTab;

        if (meetRegex.test(request.tab.url))
            meetTab = request.tab;
        else {
            sendResponse("wrong tab");
            return;
        }

        chrome.storage.session.get(['meet_bouncer']).then((res) => {
            let mbArray = res.meet_bouncer || [];
            let item = mbArray.find(item => item.target_id === meetTab.id);

            if (item) {
                chrome.tabs.sendMessage(meetTab.id, {
                    action: "change_threshold",
                    type: request.type,
                    threshold: request.threshold
                });
            } else {
                chrome.tabs.sendMessage(meetTab.id, {
                    action: "activate_extension",
                    type: request.type,
                    threshold: request.threshold
                }, () => {
                    let mbItem = {
                        'type': request.type,
                        'threshold': request.threshold,
                        'target_url': meetTab.url,
                        'target_id': meetTab.id,
                    };

                    if (chrome.runtime.lastError) {
                        chrome.storage.local.set({ 'mb_temp': mbItem });

                        chrome.scripting.executeScript({
                            target: { tabId: meetTab.id },
                            files: ["./js/googlemeet.js"],
                        });
                    }
                });
            }
        });
    }

    else if (request.action === "reset_auto_leave") {
        if (!meetRegex.test(request.tab.url)) {
            sendResponse("wrong tab");
            return;
        }

        checkTabAction(request.tab.id);

        chrome.tabs.sendMessage(request.tab.id, { action: "reset_extension" })
    }

    else if (request.action === "extension_activation") {
        chrome.storage.session.get(['meet_bouncer']).then((res) => {

            let mbArray = res.meet_bouncer || [];
            let item = mbArray.find(item => item.target_id === request.tab_id);

            if (item) {
                item.type = request.type;
                item.threshold = request.threshold;
            } else {
                mbArray.push({
                    'type': request.type,
                    'threshold': request.threshold,
                    'target_id': request.tab_id,
                    'target_url': request.tab_url,
                });
            }

            chrome.storage.session.set({ 'meet_bouncer': mbArray });

        }).then(() => {
            updateTabsStatusBasedOnVisibility();
            let threshold = request.type === "timer" ? secondsToTimeFormat(request.threshold, "hh:mm") : request.threshold;

            const typeToColor = {
                'schedule': [255, 192, 0, 255],
                'timer': [0, 192, 255, 255],
                'participants': [255, 0, 0, 255] // Used as default value
            };

            const color = typeToColor[request.type] || typeToColor['participants'];

            chrome.action.setBadgeBackgroundColor({ color: color, tabId: request.tab_id });
            chrome.action.setBadgeText({ text: "" + threshold, tabId: request.tab_id });
        });
    }

    else if (request.action === "set_badge")
        chrome.action.setBadgeText({ text: "" + request.threshold, tabId: request.tab_id });

    else if (request.action === "activate_icon")
        setIcon("active");

    else if (request.action === "disable_icon")
        setIcon("disabled");

    else if (request.action === "inactivate_icon")
        setIcon("inactive");

    else if (request.action === 'check_close_meet')
        checkTabAction(request.tab_id);

    else if (request.action === 'check_tabs_visibility') {
        const inactiveTabs = await updateTabsStatusBasedOnVisibility();
        updateNotifications(inactiveTabs);
    }

    else if (request.action === "log_message")
        console.log(request.message);

    else if (request.action === "stop_timer") {
        if (typeof intervalTabIdDict[request.tab_id] !== "undefined") {
            clearTimeout(intervalTabIdDict[request.tab_id][0]);
            delete intervalTabIdDict[request.tab_id];
        }
    }

    else if (request.action === "get_countdown_time") {
        if (typeof intervalTabIdDict[request.tab_id] !== "undefined")
            sendResponse(intervalTabIdDict[request.tab_id][1]);
        else
            sendResponse(null);
    }

    else if (request.action === "set_timer") {
        let countdownTime = request.time;

        intervalTabIdDict[request.tab_id] = new Array(2);

        intervalTabIdDict[request.tab_id][0] = setInterval(() => {

            countdownTime -= 1;

            if (countdownTime == 0)
                clearInterval(intervalTabIdDict[request.tab_id][0]);

            intervalTabIdDict[request.tab_id][1] = countdownTime;

            chrome.action.setBadgeText({ text: "" + secondsToTimeFormat(countdownTime, "hh:mm"), tabId: request.tab_id });

            chrome.runtime.sendMessage({
                action: 'redraw_timer',
                tabId: request.tab_id,
                tabUrl: request.tab_url,
                timeLeft: secondsToTimeFormat(countdownTime, "hh:mm:ss")
            });

        }, 1000);
    }
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

function checkTabAction(tab_id) {
    chrome.storage.session.get(['meet_bouncer'], (res) => {
        let meetTabs = res['meet_bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0 ||
            typeof meetTabs.find(item => item.target_id === tab_id) === 'undefined') {

            console.log("This tab is not included in meetTabs");
        }
        else {
            meetTabs = meetTabs.filter(item => item.target_id !== tab_id);
            chrome.storage.session.set({ 'meet_bouncer': meetTabs });
            redrawActiveTabsList();
            chrome.action.setBadgeText({ text: "", tabId: tab_id });
            if (meetTabs.length === 0) {
                console.log("No more extension tabs, set the disabled icon");
                setIcon("disabled");
                clearNotification();
                if (typeof intervalTabIdDict[tab_id] !== "undefined") {
                    clearTimeout(intervalTabIdDict[tab_id][0]);
                    delete intervalTabIdDict[tab_id];
                }
            }
            else {
                updateTabsStatusBasedOnVisibility();
            }
        }
    });
}

function checkTabUpdated(tabId, changeInfo) {
    if (changeInfo.status === 'loading') {
        checkTabAction(tabId);
    }
}

async function getMeetTabsAsync() {
    return new Promise((resolve) => {
        chrome.storage.session.get(['meet_bouncer'], (result) => {
            resolve(result.meet_bouncer || []);
        });
    });
}

async function updateTabsStatusBasedOnVisibility() {
    let meetTabs = await getMeetTabsAsync();

    if (meetTabs.length === 0) return;

    let activePartTabsCount = 0;
    let participantsTabsCount = 0;
    let inactiveTabs = [];

    for (const dict of meetTabs) {
        if (dict.type !== "participants") continue;
        participantsTabsCount++;

        try {
            const isVisible = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(dict.target_id, { action: "check_visibility" }, (response) => {
                    if (chrome.runtime.lastError)
                        reject(chrome.runtime.lastError.message);
                    else
                        resolve(response?.isVisible);
                });
            });

            if (isVisible)
                activePartTabsCount++;
            else
                inactiveTabs.push(dict);
        }
        catch (error) {
            console.log("Error when checking that tabs are active: ", error);
        }
    }

    redrawActiveTabsList();

    if (activePartTabsCount === participantsTabsCount) {
        console.log("All tabs with the extension are active, set the active icon");
        setIcon("active");
        clearNotification();
    }
    else {
        console.log("Not all tabs with the extension are active, set the inactive icon");
        setIcon("inactive");
    }

    return inactiveTabs;
}

async function updateNotifications(inactiveTabs) {
    if (inactiveTabs?.length === 0) return;

    const pushNotifications = await new Promise((resolve) => {
        chrome.storage.local.get(['mb_push_notifications'], (response) => {
            resolve(response.mb_push_notifications);
        });
    });

    if (pushNotifications === false) return;

    const messageText = inactiveTabs.length === 1 ? "Google Meet tab is inactive." : "Google Meet tabs are inactive.";
    const contextText = inactiveTabs.map(tab => `${tab.target_url.match(codeRegex)[0]}`).join('; ') + ';';
    notification(messageText, contextText);
}


function redrawActiveTabsList() {
    chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' }, () => {
        if (chrome.runtime.lastError)
            console.log("Error when redraw active tabs list: ", chrome.runtime.lastError.message);
    });
}

function notification(message, contextMessage) {
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: '../img/mb-active-128.png',
        title: 'MeetBouncer',
        message: message,
        contextMessage: contextMessage
    }, () => {
        console.log('Notification create');
    });
}

function clearNotification() {
    chrome.notifications.clear(notificationId, (response) => {
        if (response)
            console.log('Notification deleted');
    });
}

chrome.tabs.onRemoved.addListener(checkTabAction)
chrome.tabs.onUpdated.addListener(checkTabUpdated)
chrome.runtime.onMessage.addListener(messageListener)