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
        lastNumParticipants = document.getElementsByClassName('uGOf1d')[0].innerHTML;

        console.log("lastNumParticipants: " + lastNumParticipants);
        chrome.runtime.sendMessage({msg: 'activate_icon',
                                    threshold: threshold,
                                    tab_id: tab_id
        });

        const update = setInterval(function () {
            chrome.runtime.sendMessage({ msg: "checkTabActive", url: tab_url },
            function (response) {
                if (!response.isActive) {
                    console.log("Meet tab is inactive")
                    chrome.runtime.sendMessage({ msg: 'inactivate_icon' });
                }
            });

            let numParticipants = parseInt(document.getElementsByClassName('uGOf1d')[0].innerHTML);
            console.log('threshold:' + threshold)
            console.log('current: ' + numParticipants)

            if (numParticipants <= threshold) {
                console.log("threshold met.. user will now leave the google meet")

                for (i of document.getElementsByTagName('i')) {
                    if (i.innerHTML == 'call_end')
                        i.click()
                }
                console.log("User left the call")
                chrome.runtime.sendMessage({ msg: 'close_meet_tab', tab_id: tab_id });

                clearInterval(update)
            }
        }, 8000)
    }
});
