'use strict'

const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
//let res = "error"
//var currentTabId;

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

function processPopUpMessage(request, sender, sendResponse) {
    /*
        process sendMessage from popup.js and content.js
    */
    if (request.msg == 'set-auto-leave') {
        console.log("background.js received a click event message from popup.js for" + request.msg)
        chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
            if (meetRegex.test(tab[0].url)) {
                chrome.scripting.executeScript({
                    target: { tabId: tab[0].id },
                    files: ["./js/googlemeet.js"],
                });

                res = { target_url: tab[0].url, threshold: request.threshold, target_id: tab[0].id }
            } 
            else {
                res = "error";
            }
            sendResponse(res);
        });

        return true;
    }

    if (request.msg == 'get-threshold') {
        chrome.storage.session.get(['meet-bouncer'], function (res) {
            let meetTabs = res['meet-bouncer'];
            if (typeof meetTabs !== 'undefined' && meetTabs.length !== 0) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
                    let found_tab = meetTabs.find(item => item.target_id === tab[0].id);
                    console.log("Get-threshold from " + found_tab['target_url'])
                    if (typeof found_tab !== 'undefined')
                        res = { target_url: tab[0].url, threshold: found_tab["threshold"], target_id: tab[0].id }
                    sendResponse(res);
                });
            }
        });

        return true;
    }

    if (request.msg == "extension_activation") {
        checkTabsVisibility();
        chrome.action.setBadgeText({ text: "" + request.threshold, tabId: request.tab_id });
        return true;
    }

    if (request.msg == "set_badge") {
        chrome.action.setBadgeText({ text: "" + request.threshold, tabId: request.tab_id });
        return true;
    }

    if (request.msg == "activate_icon") {
        setIcon("active");
        return true;
    }

    if (request.msg == "disable_icon") {
        setIcon("disabled");
        return true;
    }

    if (request.msg == "inactivate_icon") {
        setIcon("inactive");
        return true;
    }

    if (request.msg == 'check_close_meet') {
        checkTabAction(request.tab_id);
        return true;
    }

    if (request.msg == 'check_tabs_visibility') {
        checkTabsVisibility();
        return true;
    }

    return true;
}

function checkTabAction(tab_id) {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0 ||
            typeof meetTabs.find(item => item.target_id === tab_id) === 'undefined') {
            console.log("This tab is not included in meetTabs");
            return false;
        } else {
            meetTabs = meetTabs.filter(item => item.target_id !== tab_id);
            chrome.storage.session.set({ 'meet-bouncer': meetTabs })
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
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0)
            return false;

        let activeTabsCount = 0;
        meetTabs.forEach((dict, index, array) => {
            chrome.tabs.sendMessage(dict.target_id, { action: "check_visibility" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log("Error when checking that tabs are active: ", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.isVisible)
                    activeTabsCount++;

                if (index === array.length - 1) {
                    if (activeTabsCount === meetTabs.length) {
                        console.log("All tabs with the extension are active, set the active icon");
                        setIcon("active");
                    } else {
                        console.log("Not all tabs with the extension are active, set the inactive icon");
                        setIcon("inactive");
                    }
                }
            });
        });
    });
}

chrome.tabs.onRemoved.addListener(checkTabAction)
chrome.tabs.onUpdated.addListener(checkTabUpdated)
chrome.runtime.onMessage.addListener(processPopUpMessage)