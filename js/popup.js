const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const webexRegex = /https?:\/\/.{1,15}.webex.com\/.{20,300}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
const display = document.getElementById("active_tabs_list")
const t = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"

window.onload = function () {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        if (typeof res !== 'undefined') {
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
            if (response === "error") {//Переделать
                display.innerHTML = "Please make sure you are in a Google Meet or WebEx tab"
                display.style.color = "red"
                display.textAlign = "centre"
            }
            if (typeof response !== 'undefined' && response !== "error") {

                chrome.storage.session.get(['meet-bouncer'], function (res) {
                    let meetsInfo = "";
                    let mbArray = [];
                    if (typeof res['meet-bouncer'] !== 'undefined')
                        mbArray = res['meet-bouncer'];

                    mbArray.push({
                        'threshold': response.threshold,
                        'target_url': response.target_url,
                        'target_id': response.target_id,
                    });
                    chrome.storage.session.set({ 'meet-bouncer': mbArray });

                    mbArray.forEach(function (item) {
                        meetsInfo += "<li>meet.google.com/" + item['target_url'].match(codeRegex)[0] + t + "lim: " + item['threshold'] + ";</li>";
                    });

                    display.innerHTML = meetsInfo;
                });
            }
        });
    }
}

function resetAutoLeave() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
        chrome.runtime.sendMessage({ msg: 'check_close_meet', tab_id: tab[0].id });
        chrome.storage.session.get(['meet-bouncer'], function (res) {
            let meetsInfo = "";
            let mbArray = [];
            if (typeof res['meet-bouncer'] !== 'undefined')
                mbArray = res['meet-bouncer'];

            mbArray = mbArray.filter(item => item.target_id !== tab[0].id);

            if (mbArray.length === 0)
                meetsInfo = "<li>No active calls</li>";

            mbArray.forEach(function (item) {
                meetsInfo += "<li>meet.google.com/" + item['target_url'].match(codeRegex)[0] + t + "lim: " + item['threshold'] + ";</li>";
            });
            display.innerHTML = meetsInfo;
        });
    });
}

const slider = document.getElementById('participants-slider');
const sliderValueDisplay = document.querySelector('.slider-value');

function updateSliderValue() {
    sliderValueDisplay.textContent = `Participants: ${slider.value}`;
}

const setButton = document.getElementById('setButton');
const resetButton = document.getElementById('resetButton');

slider.addEventListener('input', updateSliderValue);
setButton.addEventListener('click', setAutoLeave);
resetButton.addEventListener('click', resetAutoLeave);
