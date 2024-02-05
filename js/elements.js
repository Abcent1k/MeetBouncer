const minusThresholdBtn = document.getElementById("minusThresholdButton");
const plusThresholdBtn = document.getElementById("plusThresholdButton");
const setDefaultThresholdBtn = document.getElementById("setThresholdButton");
const radioTabParticipants = document.getElementById("tabParticipants");
const radioTabTime = document.getElementById("tabTime");
const contentContainer = document.getElementById('controlContainer');

const participantsContainer = document.createElement('div');
participantsContainer.classList.add('participants-control');

const slider = document.createElement('input');
slider.setAttribute('type', 'range');
slider.setAttribute('min', '1');
slider.setAttribute('max', '100');
slider.classList.add('slider');
slider.id = 'participants-slider';
participantsContainer.appendChild(slider);

const sliderLabels = document.createElement('div');
sliderLabels.classList.add('slider-labels');

const labelMin = document.createElement('span');
labelMin.textContent = '1';
sliderLabels.appendChild(labelMin);

const labelValue = document.createElement('span');
labelValue.id = 'sliderValue';
sliderLabels.appendChild(labelValue);

const labelMax = document.createElement('span');
labelMax.textContent = '100';
sliderLabels.appendChild(labelMax);

participantsContainer.appendChild(sliderLabels);


const timeContainer = document.createElement('div');
timeContainer.classList.add("time-container")

const rolldateHeaderContainer = document.createElement('div');
rolldateHeaderContainer.classList.add('centre-container');
rolldateHeaderContainer.setAttribute('id', 'rolldateHeaderContainer')


const leftHalveContainer = document.createElement('div');
leftHalveContainer.classList.add('half-container');
const rightHalveContainer = document.createElement('div');
rightHalveContainer.classList.add('half-container');


const scheduleHeader = document.createElement('h3');
scheduleHeader.innerHTML = "Schedule";
leftHalveContainer.appendChild(scheduleHeader);

const timerHeader = document.createElement('h3');
timerHeader.innerHTML = "Timer";
rightHalveContainer.appendChild(timerHeader);


const rolldateContainer = document.createElement('div');
rolldateContainer.classList.add('centre-container');

rolldateHeaderContainer.appendChild(leftHalveContainer);
rolldateHeaderContainer.appendChild(rightHalveContainer);

let selectedRolldate;

function selectRolldate (thisRolldate, anotherRolldate) {
    selectedRolldate = thisRolldate.id;
    thisRolldate.classList.add('selected-rolldate');
    anotherRolldate.classList.remove("selected-rolldate")
}

const scheduleSetter = document.createElement('input');
scheduleSetter.setAttribute('type', 'text');
scheduleSetter.setAttribute('placeholder', 'hh:mm');
scheduleSetter.setAttribute('id', "scheduleSetter");
scheduleSetter.readOnly = true;

const timerSetter = document.createElement('input');
timerSetter.setAttribute('type', 'text');
timerSetter.setAttribute('placeholder', '');
timerSetter.setAttribute('id', "timerSetter");
timerSetter.readOnly = true;

scheduleSetter.addEventListener('click', () => selectRolldate(scheduleSetter, timerSetter));
timerSetter.addEventListener('click', () => selectRolldate(timerSetter, scheduleSetter));
rolldateContainer.appendChild(scheduleSetter);
rolldateContainer.appendChild(timerSetter);

timeContainer.appendChild(rolldateHeaderContainer);
timeContainer.appendChild(rolldateContainer);


export {
    minusThresholdBtn,
    plusThresholdBtn,
    setDefaultThresholdBtn,
    radioTabParticipants,
    radioTabTime,
    contentContainer,
    participantsContainer,
    slider,
    labelValue,
    timeContainer,
    selectedRolldate
};