const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/;
const codeRegex = /\w{3}-\w{4}-\w{3}/;

chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
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
        console.log("background.js received a click event message from popup.js for " + request.action)

        let meetTab;

        if (meetRegex.test(request.tab.url))
            meetTab = request.tab;
        else {
            sendResponse("wrong tab");
            return;
        }

        chrome.storage.session.get(['meet-bouncer'], (res) => {

            let mbArray = [];
            if (typeof res['meet-bouncer'] !== 'undefined' && res['meet-bouncer'].length !== 0) {
                mbArray = res['meet-bouncer'];

                if (typeof mbArray.find(item => item.target_id === meetTab.id) !== 'undefined') {
                    for (let item of mbArray) {
                        if (item.target_id === meetTab.id) {
                            item.threshold = request.threshold;
                            break;
                        }
                    }
                    chrome.storage.session.set({ 'meet-bouncer': mbArray });

                    chrome.tabs.sendMessage(meetTab.id, {
                        action: "change_threshold",
                        threshold: request.threshold
                    });
                    return;
                }
            }
            chrome.tabs.sendMessage(meetTab.id, { action: "activate_extension" }, () => {
                let mbItem = {
                    'threshold': request.threshold,
                    'target_url': meetTab.url,
                    'target_id': meetTab.id,
                };
                mbArray.push(mbItem);
                chrome.storage.session.set({ 'meet-bouncer': mbArray });

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
        chrome.action.setBadgeText({ text: "" + request.threshold, tabId: request.tab_id });
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

    else if (request.action == "log_message")
        console.log(request.message);
}

function checkTabAction(tab_id) {
    chrome.storage.session.get(['meet-bouncer'], (res) => {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0 ||
            typeof meetTabs.find(item => item.target_id === tab_id) === 'undefined') {

            console.log("This tab is not included in meetTabs");
        } else {
            meetTabs = meetTabs.filter(item => item.target_id !== tab_id);
            chrome.storage.session.set({ 'meet-bouncer': meetTabs });
            chrome.runtime.sendMessage({ action: 'redraw_active_tabs_list' });
            chrome.action.setBadgeText({ text: "", tabId: tab_id });
            if (meetTabs.length === 0) {
                console.log("No more extension tabs, set the disabled icon");
                setIcon("disabled");
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
    chrome.storage.session.get(['meet-bouncer'], (res) => {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0)
            return;

        let activeTabsCount = 0;
        setTimeout(() => {
            meetTabs.forEach((dict, index, array) => {
                chrome.tabs.sendMessage(dict.target_id, { action: "check_visibility" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Error when checking that tabs are active: ", chrome.runtime.lastError.message);
                        return;
                    }
                    if (response?.isVisible)
                        activeTabsCount++;

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
                            } else {
                                console.log("Not all tabs with the extension are active, set the inactive icon");
                                setIcon("inactive");
                            }
                        }, 10);
                    }
                });
            });
        }, 10);
    });
}

chrome.tabs.onRemoved.addListener(checkTabAction)
chrome.tabs.onUpdated.addListener(checkTabUpdated)
chrome.runtime.onMessage.addListener(messageListener)