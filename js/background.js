'use strict'

let meetTabs = {};
const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
var res = "error"
var currentTabId;

function setIcon(activeFlag) {
    if (activeFlag)
    {
        chrome.action.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
        chrome.action.setIcon({path: "../img/mb-active38.png"});
    }
    else
    {
        chrome.action.setBadgeText({text: ""});
        chrome.action.setIcon({path: "../img/mb-inactive38.png"});
    }

}

function processPopUpMessage(request, sender, sendResponse) {
    /*
        process sendMessage from popup.js and content.js
    */
    if (request.msg == 'set-auto-leave') {
        console.log("background.js received a click event message from popup.js for" + request.msg)
        chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
            if(meetRegex.test(tab[0].url)) {
                currentTabId = tab[0].id
                meetTabs[currentTabId] = tab[0].url;
                chrome.scripting.executeScript({
                    target: {tabId: tab[0].id},
                    files: ["./js/googlemeet.js"]
                });
                res = {target: tab[0].url, threshold: request.threshold}
            }
            sendResponse(res);
        });

        return true;
    }

    if ( request.msg == 'get-threshold') {
        chrome.storage.local.get(['mb-threshold'], function (res) {
            sendResponse(res['mb-threshold'])
        })

        return true;
    }

    if (request.msg == "activate_icon") {
        chrome.action.setBadgeText({text: "" + request.threshold});
        setIcon(true);

        return true;
    }

     if (request.msg == "default_icon") {
        setIcon(false);

        return true;
    }

    return true;
}

function checkTabClosed(tabId, removed) {
    /*
    This method check if a tab is closed and whether it matches the tabId of the google meet tab
    */
    console.log(tabId)
    console.log(currentTabId)
    if (tabId == currentTabId) {

        setIcon(false);

        console.log('tab id matches, storage will now be cleared')
        chrome.storage.local.clear(function() {
            var error = chrome.runtime.lastError;
            if (error)
                console.error(error);
        });
    } else {
        console.log("does not match")
    }
}
chrome.tabs.onRemoved.addListener(checkTabClosed)
chrome.runtime.onMessage.addListener(processPopUpMessage)




