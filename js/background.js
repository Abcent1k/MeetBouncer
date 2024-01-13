const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
let res = "error"

function setIcon(activeFlag) {
    if (activeFlag == "active") {
        chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
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

function extensionActivation(request, sender, sendResponse) {
    if (request.msg == 'set-auto-leave') {
        console.log("background.js received a click event message from popup.js for " + request.msg)
        chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
            if (meetRegex.test(tab[0].url)) {
                chrome.storage.session.get(['meet-bouncer'], function (res) {
                    let mbArray = [];
                    if (typeof res['meet-bouncer'] !== 'undefined' && res['meet-bouncer'].length !== 0) {
                        mbArray = res['meet-bouncer'];

                        if (typeof mbArray.find(item => item.target_id === tab[0].id) !== 'undefined') {
                            for (let item of mbArray) {
                                if (item.target_id === tab[0].id) {
                                    item.threshold = request.threshold;
                                    break;
                                }
                            }
                            chrome.storage.session.set({ 'meet-bouncer': mbArray });

                            chrome.tabs.sendMessage(tab[0].id, { action: "change_threshold", threshold: request.threshold });
                            return;
                        }
                    }
                    chrome.tabs.sendMessage(tab[0].id, { action: "activate_extension" }, function (response) {
                        mbArray.push({
                            'threshold': request.threshold,
                            'target_url': tab[0].url,
                            'target_id': tab[0].id,
                        });
                        chrome.storage.session.set({ 'meet-bouncer': mbArray });

                        if (chrome.runtime.lastError) {
                            chrome.scripting.executeScript({
                                target: { tabId: tab[0].id },
                                files: ["./js/googlemeet.js"],
                            });
                        }
                    });
                });
            }
        });
    }

    else if (request.msg == 'get-info') {
        chrome.storage.session.get(['meet-bouncer'], function (res) {
            let meetTabs = res['meet-bouncer'];

            if (typeof meetTabs !== 'undefined' && meetTabs.length !== 0) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
                    let found_tab = meetTabs.find(item => item.target_id === tab[0].id);
                    console.log("Get-info from " + found_tab['target_url'])

                    if (typeof found_tab !== 'undefined')
                        res = { target_url: tab[0].url, threshold: found_tab["threshold"], target_id: tab[0].id }

                    sendResponse(res);
                });
            }
        });
    }

    else if (request.msg == "extension_activation") {
        checkTabsVisibility();
        chrome.action.setBadgeText({ text: "" + request.threshold, tabId: request.tab_id });
    }

    else if (request.msg == "set_badge")
        chrome.action.setBadgeText({ text: "" + request.threshold, tabId: request.tab_id });

    else if (request.msg == "activate_icon")
        setIcon("active");

    else if (request.msg == "disable_icon")
        setIcon("disabled");

    else if (request.msg == "inactivate_icon")
        setIcon("inactive");

    else if (request.msg == 'check_close_meet')
    {
        checkTabAction(request.tab_id, function(result) {
            sendResponse(result);
        });
    }

    else if (request.msg == 'check_tabs_visibility')
        checkTabsVisibility();

    else if (request.msg == "log_message")
        console.log(request.message);

    return true;
}

function checkTabAction(tab_id, callback) {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0 ||
            typeof meetTabs.find(item => item.target_id === tab_id) === 'undefined') {
            console.log("This tab is not included in meetTabs");
            callback(false);
        } else {
            meetTabs = meetTabs.filter(item => item.target_id !== tab_id);
            chrome.storage.session.set({ 'meet-bouncer': meetTabs });
            chrome.runtime.sendMessage({action: 'redraw_active_tabs_list'});
            chrome.action.setBadgeText({ text: "", tabId: tab_id });
            if (meetTabs.length === 0) {
                console.log("No more extension tabs, set the disabled icon");
                setIcon("disabled");
            }
            callback(true);
        }
    });
}

function checkTabUpdated(tabId, changeInfo) {
    if (changeInfo.status === 'loading') {
        checkTabAction(tabId);
    }
}

function checkTabsVisibility() {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0)
            return false;

        let activeTabsCount = 0;
        setTimeout(function () {
            meetTabs.forEach((dict, index, array) => {
                chrome.tabs.sendMessage(dict.target_id, { action: "check_visibility" }, function (response) {
                    if (chrome.runtime.lastError) {
                        console.log("Error when checking that tabs are active: ", chrome.runtime.lastError.message);
                        return;
                    }
                    if (response && response.isVisible)
                        activeTabsCount++;

                    if (index === array.length - 1) {
                        setTimeout(function () {
                            chrome.runtime.sendMessage({action: 'redraw_active_tabs_list'});
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
chrome.runtime.onMessage.addListener(extensionActivation)