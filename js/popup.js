const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const webexRegex = /https?:\/\/.{1,15}.webex.com\/.{20,300}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
let t = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"

window.onload = function () {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        if (typeof res !== 'undefined') {
            const display = document.getElementById("active_tabs_list")
            let meetsInfo = "";
            if (typeof res['meet-bouncer'] === 'undefined' || res['meet-bouncer'].length === 0) {
                meetsInfo = "<li>No active calls</li>";
            }
            else {
                res['meet-bouncer'].forEach(function (item) {
                    meetsInfo += "<li>meet.google.com/" + item['target_url'].match(codeRegex)[0] + t + "lim: " + item['threshold'] + ";</li>";
                });
            }
            display.innerHTML = meetsInfo;
        }
        updateSliderValue();
    })
}

function setAutoLeave() {
    let threshold = document.getElementById('participants-slider').value;
    if (parseInt(threshold) > 0) {
        chrome.runtime.sendMessage({ msg: 'set-auto-leave', threshold: threshold }, function (response) {
            if (!response) {
                console.log(chrome.runtime.lastError.message)
            }
            if (response === "error") {
                const display = document.getElementById("activeTabName") // Переделать
                display.innerHTML = "Please make sure you are in a Google Meet or WebEx tab"
                display.style.color = "red"
                display.textAlign = "centre"
            }
            if (typeof response !== 'undefined' && response !== "error") {

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

                    const display = document.getElementById("active_tabs_list")
                    let meetsInfo = "";

                    mbArray.forEach(function (item) {
                        meetsInfo += "<li>meet.google.com/" + item['target_url'].match(codeRegex)[0] + t + "lim: " + item['threshold'] + ";</li>";
                    });

                    display.innerHTML = meetsInfo;
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

const setButton = document.getElementById('setButton');

slider.addEventListener('input', updateSliderValue);
setButton.addEventListener('click', setAutoLeave)
