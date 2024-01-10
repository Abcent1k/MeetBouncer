const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const webexRegex = /https?:\/\/.{1,15}.webex.com\/.{20,300}/
const codeRegex = /\w{3}-\w{4}-\w{3}/

window.onload = function () {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        // if (typeof res !== 'undefined') {
        //     const display = document.getElementById("activeTabName")
        //     let meetsInfo = "Active meets: ";
        //     res['meet-bouncer'].forEach(function (item) {
        //         meetsInfo += item['target_url'].match(codeRegex)[0] + ", threshold: " + item['threshold'] + ";\n";
        //     });
        //     display.innerHTML = meetsInfo
        //     display.style.color = "blue"
        //     display.textAlign = "centre"
        // }
        updateSliderValue();
    })
}

function setAutoLeave() {
    console.log("AaAAAAaAA");
    let threshold = 1;//document.getElementById('participants-slider').value
    if (parseInt(threshold) > 0) {
        chrome.runtime.sendMessage({ msg: 'set-auto-leave', threshold: threshold }, function (response) {
            if (!response) {
                console.log(chrome.runtime.lastError.message)
            }
            else if (response == "error") {
                const display = document.getElementById("activeTabName")
                display.innerHTML = "Please make sure you are in a Google Meet or WebEx tab"
                display.style.color = "red"
                display.textAlign = "centre"
            }
            else if (response != "error" && typeof response !== 'undefined') {
                const display = document.getElementById("activeTabName")
                if (meetRegex.test(response.target)) {
                    display.innerHTML = "Active meet: " + response.target.match(codeRegex)[0] + ", threshold: " + response.threshold
                    display.style.color = "green"
                    display.textAlign = "centre"
                }
                else if (webexRegex.test(response.target)) {
                    display.innerHTML = "Active webex: " + response.target.match(codeRegex)[0] + ", threshold: " + response.threshold
                    display.style.color = "green"
                    display.textAlign = "centre"
                }

                chrome.storage.session.get(['meet-bouncer'], function (res) {
                    let mbArray = [];
                    if (typeof res['meet-bouncer'] !== 'undefined') {
                        mbArray = res['meet-bouncer'];
                    }
                    mbArray.push({
                        'threshold': response.threshold,
                        'target_url': response.target_url,
                        'target_id': response.target_id,
                    });
                    chrome.storage.session.set({ 'meet-bouncer': mbArray });
                });
            }
        });
    }
}

const slider = document.getElementById('participants-slider');
const sliderValueDisplay = document.querySelector('.slider-value');

function updateSliderValue() {
  sliderValueDisplay.textContent = `Participants: ${slider.value}`;
}

//const setButton = document.getElementById('setButton');

slider.addEventListener('input', updateSliderValue);
setButton.addEventListener('click', setAutoLeave)
