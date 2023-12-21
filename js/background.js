'use strict'

const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
var res = "error"
var currentTabId;

function setIcon(activeFlag) {
    if (activeFlag == "active") {
        chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
        chrome.action.setIcon({ path: {
            "16": "../img/mb-active-16.png",
            "48": "../img/mb-active-48.png"
            }
        });
    }
    else if (activeFlag == "inactive") {
        chrome.action.setIcon({ path: {
            "16": "../img/mb-inactive-16.png",
            "48": "../img/mb-inactive-48.png"
            }
        });
    }
    else if (activeFlag == "disabled") {
        chrome.action.setIcon({ path: {
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
                    sendResponse(res)
                });
            }
        });

        return true;
    }

    if (request.msg == "activate_icon") {
        chrome.action.setBadgeText({ text: "" + request.threshold, tabId: request.tab_id });
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
        checkTabClosed(request.tab_id);
        return true;
    }

    return true;
}

function checkTabClosed(closedInfo) {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0 ||
            typeof meetTabs.find(item => item.target_id === closedInfo) === 'undefined') {
            console.log("Сlosed tab is not included in meetTabs")
            return false;
        }

        meetTabs = meetTabs.filter(item => item.target_id !== closedInfo);
        chrome.storage.session.set({ 'meet-bouncer': meetTabs })
        chrome.action.setBadgeText({ text: "", tabId: closedInfo });
        if (meetTabs.length === 0) {
            console.log("No more extension tabs, set the disabled icon")
            setIcon("disabled")
        }
        return true;
    });
}

function checkTabActivated(activeInfo) {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        let meetTabs = res['meet-bouncer'];

        if (typeof meetTabs === 'undefined' || meetTabs.length === 0)
            return false;

        let activeTabsCount = 0;
        meetTabs.forEach((dict, index, array) => {
            chrome.tabs.get(dict.target_id, function(tab) {
                if (chrome.runtime.lastError) {
                    console.log("Error on receiving a tab: ", chrome.runtime.lastError.message);
                    return;
                }
                if (typeof tab !== "undefined" && tab.active)
                    activeTabsCount++;
                if (index === array.length - 1) {
                    if (activeTabsCount === meetTabs.length) {
                        console.log("All tabs with the extension are active, set the active icon")
                        setIcon("active");
                    } else {
                        console.log("Not all tabs with the extension are active, set the inactive icon")
                        setIcon("inactive");
                    }
                }
            });
        });
    });
}

chrome.tabs.onRemoved.addListener(checkTabClosed)
//chrome.tabs.onUpdated.addListener()
chrome.tabs.onActivated.addListener(checkTabActivated)
chrome.runtime.onMessage.addListener(processPopUpMessage)