var threshold;
var intervalId;
var isPaused = false;
var tab_id;
var tab_url;

chrome.runtime.sendMessage({ msg: "get-info" }, function (response) {
    threshold = response.threshold
    tab_id = response.target_id
    tab_url = response.target_url

    if (document.getElementsByClassName('uGOf1d').length <= 0) {
        alert("Please make sure you have already joined the room!")
    } else {
        chrome.runtime.sendMessage({msg: 'extension_activation',
                                    threshold: threshold,
                                    tab_id: tab_id
        });

        intervalId = setInterval(function () {
            if (!isPaused) {
                let numParticipants = parseInt(document.getElementsByClassName('uGOf1d')[0].innerHTML);
                console.log('Threshold: ' + threshold + "\n" + 'Current participants: ' + numParticipants)

                if (numParticipants <= threshold) {
                    console.log("Threshold met.. user will now leave the google meet")

                    for (i of document.getElementsByTagName('i')) {
                        if (i.innerHTML == 'call_end')
                            i.click()
                    }
                    console.log("User left the call")
                    chrome.runtime.sendMessage({ msg: 'check_close_meet', tab_id: tab_id });

                    clearInterval(intervalId)
                }
            }
        }, 8000);
    }
});

document.addEventListener("visibilitychange", function() {
    chrome.runtime.sendMessage({msg: 'check_tabs_visibility'});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "check_visibility") {
        const isVisible = document.visibilityState === "visible";
        sendResponse({ isVisible: isVisible });
    }
    else if (request.action === "change_threshold") {
        threshold = request.threshold;
        chrome.runtime.sendMessage({msg: 'set_badge',
            threshold: threshold,
            tab_id: tab_id
        });
        chrome.runtime.sendMessage({action: 'redraw_active_tabs_list'});
        console.log("Threshold changed");
    }
    else if (request.action === "reset_extension") {
        isPaused = true;
        chrome.runtime.sendMessage({action: 'redraw_active_tabs_list'});
        console.log("Extension reset on this tab");
    }
    else if (request.action === "activate_extension") {
        isPaused = false;
        chrome.runtime.sendMessage({msg: 'extension_activation',
            threshold: threshold,
            tab_id: tab_id
        });
        chrome.runtime.sendMessage({action: 'redraw_active_tabs_list'});
        console.log("Extension activated on this tab");
        sendResponse(true);
    }
});