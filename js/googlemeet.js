var threshold;

chrome.runtime.sendMessage({ msg: "get-threshold" }, function (response) {
    /*
      method to get threshold from background page
    */
    console.log('threshold:' + response)
    threshold = response


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
});
