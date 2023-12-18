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

function googlemeet(threshold)
{
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
        chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
            if(meetRegex.test(tab[0].url)) {
                meetTabs[tab[0].id] = [tab[0].url, request.threshold];
                chrome.scripting.executeScript({
                    target: {tabId: tab[0].id},
                    files: ["./js/googlemeet.js"],
                    //args: [request.threshold],
                    //function: googlemeet
                });

                res = {target: tab[0].url, threshold: request.threshold}
            }
            sendResponse(res);
        });

        return true;
    }

    if ( request.msg == 'get-threshold') {
        chrome.storage.session.get(['meet-bouncer'], function (res) {
            chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
                if (meetRegex.test(tab[0].url))
                {
                    for(let key in res['meet-bouncer']){
                        if(res['meet-bouncer'][key]['target-tab'] == tab[0].url)
                            sendResponse(res['meet-bouncer'][key]['threshold']);
                    }
                }
            });
        });

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
function checkTabActivated(activeInfo)
{
    if (meetTabs.length == 0) {
        setIcon(false);
    }
    else if (meetTabs[activeInfo.tabId]) {
        chrome.action.setBadgeText({text: "" + meetTabs[activeInfo.tabId][1]});
    }
    else{
        chrome.action.setBadgeText({text: ""});
    }

    // console.log("tabId:"+tabId.tabId)
    // if (true){
    //     chrome.storage.session.get(['meet-bouncer'], function(res) {
    //         if(typeof res['meet-bouncer'] !== 'undefined' || res['meet-bouncer'].length == 0){
    //             setIcon(false);
    //         }
    //         for(let key in res['meet-bouncer'])
    //         {
    //             setIcon(true);
    //             if (tabId == key)
    //             {
    //                 chrome.action.setBadgeText({text: "" + res['meet-bouncer'][key]["threshold"]});
    //             }
    //         }
    //     });
    // }
}
chrome.tabs.onRemoved.addListener(checkTabClosed)
chrome.tabs.onActivated.addListener(checkTabActivated)
chrome.runtime.onMessage.addListener(processPopUpMessage)




