const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/;
const codeRegex = /\w{3}-\w{4}-\w{3}/;
const notificationId = "1";
let intervalTabIdDict = {};

chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
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

function messageListener(request, sender, sendResponse) {
    if (request.action === 'set_auto_leave') {
        let meetTab;

        if (meetRegex.test(request.tab.url))
            meetTab = request.tab;
        else {
            sendResponse("wrong tab");
            return;
        }

        chrome.storage.session.get(['meet_bouncer'], (res) => {

            let mbArray = [];
            if (typeof res['meet_bouncer'] !== 'undefined' && res['meet_bouncer'].length !== 0) {
                mbArray = res['meet_bouncer'];

                if (typeof mbArray.find(item => item.target_id === meetTab.id) !== 'undefined') {
                    for (let item of mbArray) {
                        if (item.target_id === meetTab.id) {
                            item.type = request.type;
                            item.threshold = request.threshold;
                            break;
                        }
                    }
                    chrome.storage.session.set({ 'meet_bouncer': mbArray });

                    chrome.tabs.sendMessage(meetTab.id, {
                        action: "change_threshold",
                        type: request.type,
                        threshold: request.threshold
                    });
                    return;
                }
            }
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
                mbArray.push(mbItem);
                chrome.storage.session.set({ 'meet_bouncer': mbArray });

                if (chrome.runtime.lastError) {

                    chrome.storage.local.set({ 'mb_temp': mbItem });

                    chrome.scripting.executeScript({
                        target: { tabId: meetTab.id },
                        files: ["./js/googlemeet.js"],
                    });
                }
            });
        });
    }

    else if (request.action === "reset_auto_leave") {
        let meetTab;

        if (meetRegex.test(request.tab.url))
            meetTab = request.tab;
        else {
            sendResponse("wrong tab");
            return;
        }

        checkTabAction(meetTab.id);

        chrome.tabs.sendMessage(meetTab.id, { action: "reset_extension" })
    }

    else if (request.action === "extension_activation") {
        checkTabsVisibility();
        let threshold = request.type === "timer" ? secondsToTimeFormat(request.threshold) : request.threshold;
        chrome.action.setBadgeText({ text: "" + threshold, tabId: request.tab_id });
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

    else if (request.action === 'check_tabs_visibility')
        checkTabsVisibility();

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
            sendResponse(null)
    }

    else if (request.action === "set_timer") {
        let countdownTime = request.time;

        intervalTabIdDict[request.tab_id] = new Array(2);

        intervalTabIdDict[request.tab_id][0] = setInterval(() => {

            countdownTime -= 1;

            if (countdownTime == 0)
                clearInterval(intervalTabIdDict[request.tab_id][0]);

            let countdownTimeFormat = secondsToTimeFormat(countdownTime);

            intervalTabIdDict[request.tab_id][1] = countdownTime;

            chrome.action.setBadgeText({ text: "" + countdownTimeFormat, tabId: request.tab_id });

            chrome.runtime.sendMessage({
                action: 'redraw_timer',
                tabId: request.tab_id,
                tabUrl: request.tab_url,
                timeLeft: countdownTimeFormat
            });

        }, 1000);
    }
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
            chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
            chrome.action.setBadgeText({ text: "", tabId: tab_id });
            if (meetTabs.length === 0) {
                console.log("No more extension tabs, set the disabled icon");
                setIcon("disabled");
                if (typeof intervalTabIdDict[tab_id] !== "undefined") {
                    clearTimeout(intervalTabIdDict[tab_id][0]);
                    delete intervalTabIdDict[tab_id];
                }
            }
            else {
                checkTabsVisibility();
            }
        }
    });
}

function checkTabUpdated(tabId, changeInfo) {
    if (changeInfo.status === 'loading') {
        checkTabAction(tabId);
    }
}

function checkTabsVisibility() {
    chrome.storage.session.get(['meet_bouncer'], (res) => {
        let meetTabs = res['meet_bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0)
            return;

        let activeTabsCount = 0;
        setTimeout(() => {
            let inactiveTabs = [];
            meetTabs.forEach((dict, index, array) => {
                chrome.tabs.sendMessage(dict.target_id, { action: "check_visibility" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Error when checking that tabs are active: ", chrome.runtime.lastError.message);
                        return;
                    }
                    if (response?.isVisible)
                        activeTabsCount++;
                    else
                        inactiveTabs.push(dict);

                    if (index === array.length - 1) {
                        setTimeout(() => {
                            chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' }, () => {
                                if (chrome.runtime.lastError) {
                                    console.log("Error when checking that tabs are active: ",
                                        chrome.runtime.lastError.message);
                                }
                            });
                            if (activeTabsCount === meetTabs.length) {
                                console.log("All tabs with the extension are active, set the active icon");
                                setIcon("active");
                                clearNotification();
                            } else {
                                console.log("Not all tabs with the extension are active, set the inactive icon");
                                setIcon("inactive");
                                chrome.storage.local.get(['mb_push_notifications'], (res) => {
                                    if (res?.mb_push_notifications === false) {
                                        clearNotification();
                                        return;
                                    }

                                    let messageText = "";
                                    let contextText = "";
                                    if (inactiveTabs.length === 1) {
                                        messageText = "Google Meet tab is inactive.";
                                        contextText = `${inactiveTabs[0].target_url.match(codeRegex)[0]};`;
                                    } else {
                                        inactiveTabs.forEach(
                                            (element) => contextText += `${element.target_url.match(codeRegex)[0]}; `)
                                        messageText = "Google Meet tabs is inactive.";
                                    }
                                    notification(messageText, contextText);

                                });
                            }
                        }, 10);
                    }
                });
            });
        }, 10);
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