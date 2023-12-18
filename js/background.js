'use strict'

const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
var res = "error"
var currentTabId;

function setIcon(activeFlag) {
    if (activeFlag) {
        chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
        chrome.action.setIcon({ path: "../img/mb-active38.png" });
    }
    else {
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setIcon({ path: "../img/mb-inactive38.png" });
    }

}

function googlemeet(threshold) {
    if (document.getElementsByClassName('uGOf1d').length <= 0) {
        /*
            user have not enter the room.
        */
        alert("Please make sure you have already joined the room!")
    } else {
        lastNumParticipants = document.getElementsByClassName('uGOf1d')[0].innerHTML;
        if (typeof init === 'undefined') {
            const init = function () {
                console.log("lastNumParticipants: " + lastNumParticipants);
                chrome.runtime.sendMessage({ msg: 'activate_icon', threshold: threshold }, function (response) {
                    if (response)
                        console.log("Image is set");
                    else
                        console.log("Image is not set");
                });
            }
            init()
        }
        if (typeof update === 'undefined') {
            const update = setInterval(function () {
                let numParticipants = parseInt(document.getElementsByClassName('uGOf1d')[0].innerHTML);
                console.log('threshold:' + threshold)
                console.log('current: ' + numParticipants)

                if (numParticipants <= threshold) {
                    console.log("threshold met.. user will now leave the google meet")
                    /*
                        assume user is not a host
                    */
                    let a = document.getElementsByTagName('i')

                    for (i of a) {
                        if (i.innerHTML == 'call_end') {
                            i.click()
                        }
                    }
                    console.log("user left the call")

                    chrome.runtime.sendMessage({ msg: 'default_icon' }, function (response) {
                        if (response)
                            console.log("Image is reset");
                        else
                            console.log("Image is not reset");
                    });

                    clearInterval(update)
                }
            }
                , 8000)
        } else {
            console.log("another call already exist")
        }
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
                    //args: [request.threshold],
                    //function: googlemeet
                });

                res = { target_url: tab[0].url, threshold: request.threshold, target_id: tab[0].id}
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
                    console.log("Get-threshold from "+ found_tab['target_url'])
                    if(typeof found_tab !== 'undefined')
                        sendResponse(found_tab["threshold"])
                });
            }
        });

        return true;
    }

    if (request.msg == "activate_icon") {
        chrome.action.setBadgeText({ text: "" + request.threshold });
        setIcon(true);
        return true;
    }

    if (request.msg == "default_icon") {
        setIcon(false);
        return true;
    }

    return true;
}

// function checkTabCreated(activeInfo)
// {
//     let currentTabId = activeInfo.tabId;

//     for (let key in meetTabs) {
//         console.log("aboba: " + key);
//         chrome.scripting.executeScript({
//             target: { tabId: parseInt(key) },
//             function: function () {
//                 let a = document.getElementsByTagName('i')

//                 for (i of a) {
//                     if (i.innerHTML == 'call_end') {
//                         i.click()
//                     }
//                 }
//             }
//         });
//     }
// }

function checkTabClosed(activeInfo, removed) {
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
function checkTabActivated(activeInfo)
{
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        let meetTabs = res['meet-bouncer'];
        //console.log("aMoGus: "+meetTabs.length);
        if (typeof meetTabs === 'undefined' || meetTabs.length === 0) {
            setIcon(false);
        }
        else {
            let found_tab = meetTabs.find(item => item.target_id === activeInfo.tabId);
            setIcon(true);
            if(typeof found_tab !== 'undefined')
            {
                console.log("AAAAA "+ found_tab['target_url'])
                chrome.action.setBadgeText({ text: "" + found_tab['threshold']});
            }
            else
                chrome.action.setBadgeText({ text: "" });
        }
    });
}
chrome.tabs.onRemoved.addListener(checkTabClosed)
//chrome.tabs.onZoomChange.addListener(checkTabCreated)
chrome.tabs.onActivated.addListener(checkTabActivated)
chrome.runtime.onMessage.addListener(processPopUpMessage)




