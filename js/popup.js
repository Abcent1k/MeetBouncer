const meetRegex = /https?:\/\/meet.google.com\/\w{3}-\w{4}-\w{3}/
const webexRegex = /https?:\/\/.{1,15}.webex.com\/.{20,300}/
const codeRegex = /\w{3}-\w{4}-\w{3}/
const setButton = document.getElementById('setButton');
const resetButton = document.getElementById('resetButton');
const tab_container = document.getElementById("active_tabs_list")
const t = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"

window.onload = function () {
    chrome.storage.session.get(['meet-bouncer'], function (res) {
        if (typeof res !== 'undefined') {
            if (typeof res['meet-bouncer'] === 'undefined' || res['meet-bouncer'].length === 0)
                addNoActiveCalls();
            else {
                tab_container.innerHTML = "";
                res['meet-bouncer'].forEach(function (item) {
                    addListItem(item);
                });
            }
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
                //make sure you are in a Google Meet tab
            }
            if (typeof response !== 'undefined' && response !== "error") {

                chrome.storage.session.get(['meet-bouncer'], function (res) {
                    let mbArray = [];
                    if (typeof res['meet-bouncer'] !== 'undefined')
                        mbArray = res['meet-bouncer'];

                    mbArray.push({
                        'threshold': response.threshold,
                        'target_url': response.target_url,
                        'target_id': response.target_id,
                    });
                    chrome.storage.session.set({ 'meet-bouncer': mbArray });

                    tab_container.innerHTML = "";
                    mbArray.forEach(function (item) {
                        addListItem(item);
                    });
                });
            }
        });
    }
}

function resetAutoLeave() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
        chrome.runtime.sendMessage({ msg: 'check_close_meet', tab_id: tab[0].id });
        chrome.tabs.sendMessage(tab[0].id, { action: "reset_extension"});
        chrome.storage.session.get(['meet-bouncer'], function (res) {
            let mbArray = [];
            if (typeof res['meet-bouncer'] !== 'undefined')
                mbArray = res['meet-bouncer'];

            mbArray = mbArray.filter(item => item.target_id !== tab[0].id);

            tab_container.innerHTML = "";

            if (mbArray.length === 0)
                addNoActiveCalls();

            mbArray.forEach(function (item) {
                addListItem(item);
            });
        });
    });
}

function addListItem(tab) {
    chrome.tabs.sendMessage(tab.target_id, { action: "check_visibility" }, function (response) {
        let listItem = document.createElement('li');
        listItem.innerHTML = `<span class="left-part">meet.google.com/${tab['target_url'].match(codeRegex)[0]}</span><span class="right-part">lim: ${tab['threshold']}</span>`;
        if (response && !response.isVisible) 
            listItem.className = "orange";
        listItem.style.cursor = 'pointer';
        listItem.setAttribute('data-tabId', tab["target_id"]);
        listItem.addEventListener('click', function() {
            let tabId = parseInt(this.getAttribute('data-tabId'));
            chrome.tabs.update(tabId, {active: true});
        });
        document.querySelector('#active_tabs_list').appendChild(listItem);
        return listItem
    });
}

function addNoActiveCalls() {
    let listItem = document.createElement('li');
    listItem.innerHTML = `No active calls`;
    document.querySelector('#active_tabs_list').appendChild(listItem);
}

const slider = document.getElementById('participants-slider');
const sliderValueDisplay = document.querySelector('.slider-value');

function updateSliderValue() {
    sliderValueDisplay.textContent = `Participants: ${slider.value}`;
}

slider.addEventListener('input', updateSliderValue);
setButton.addEventListener('click', setAutoLeave);
resetButton.addEventListener('click', resetAutoLeave);