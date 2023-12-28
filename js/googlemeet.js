var threshold;

chrome.runtime.sendMessage({ msg: "get-threshold" }, function (response) {
    threshold = response.threshold
    tab_id = response.target_id
    tab_url = response.target_url


    if (document.getElementsByClassName('uGOf1d').length <= 0) {
        /*
            user have not enter the room.
        */
        alert("Please make sure you have already joined the room!")
    } else {
        chrome.runtime.sendMessage({msg: 'extension_activation',
                                    threshold: threshold,
                                    tab_id: tab_id
        });

        const update = setInterval(function () {
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

                clearInterval(update)
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
});
