const minusThresholdBtn = document.getElementById("minusThresholdButton");
const plusThresholdBtn = document.getElementById("plusThresholdButton");
const setDefaultThresholdBtn = document.getElementById("setThresholdButton");
const radioTabParticipants = document.getElementById("tabParticipants");
const radioTabSchedule = document.getElementById("tabSchedule");
const radioTabTimer = document.getElementById("tabTimer");
const contentContainer = document.getElementById('controlContainer');

const participantsContainer = document.createElement('div');
participantsContainer.classList.add('participants-container');

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

const scheduleContainer = document.createElement('div');
scheduleContainer.classList.add("time-container")

const scheduleSetter = document.createElement('input');
scheduleSetter.classList.add("rolldate");
scheduleSetter.setAttribute('type', 'text');
scheduleSetter.setAttribute('placeholder', 'hh:mm');
scheduleSetter.setAttribute('id', "scheduleSetter");
scheduleSetter.readOnly = true;
scheduleContainer.appendChild(scheduleSetter);


const timerContainer = document.createElement('div');
timerContainer.classList.add("time-container")

const timerSetter = document.createElement('input');
timerSetter.classList.add("rolldate");
timerSetter.setAttribute('type', 'text');
timerSetter.setAttribute('placeholder', '');
timerSetter.setAttribute('id', "timerSetter");
timerSetter.readOnly = true;
timerContainer.appendChild(timerSetter);


export {
    minusThresholdBtn,
    plusThresholdBtn,
    setDefaultThresholdBtn,
    radioTabParticipants,
    radioTabSchedule,
    radioTabTimer,
    contentContainer,
    participantsContainer,
    scheduleContainer,
    timerContainer,
    slider,
    labelValue,
    scheduleSetter,
    timerSetter
};