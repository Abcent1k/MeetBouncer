const minusThresholdBtn = document.getElementById("minusThresholdButton");
const plusThresholdBtn = document.getElementById("plusThresholdButton");
const setDefaultThresholdBtn = document.getElementById("setThresholdButton");
const radioTabParticipants = document.getElementById("tabParticipants");
const radioTabTime = document.getElementById("tabTime");
const contentContainer = document.getElementById('controlContainer');

// Создание объекта thresholdParticipantsContainer
const thresholdParticipantsContainer = document.createElement('div');
thresholdParticipantsContainer.classList.add('participants-control');

const header = document.createElement('h2');
header.textContent = 'Participants Control';
thresholdParticipantsContainer.appendChild(header);

const slider = document.createElement('input');
slider.setAttribute('type', 'range');
slider.setAttribute('min', '1');
slider.setAttribute('max', '100');
slider.setAttribute('value', '5');
slider.classList.add('slider');
slider.id = 'participants-slider';
thresholdParticipantsContainer.appendChild(slider);

const sliderLabels = document.createElement('div');
sliderLabels.classList.add('slider-labels');

const labelMin = document.createElement('span');
labelMin.textContent = '1';
sliderLabels.appendChild(labelMin);

const labelValue = document.createElement('span');
labelValue.id = 'sliderValue';
labelValue.textContent = 'Participants: 5';
sliderLabels.appendChild(labelValue);

const labelMax = document.createElement('span');
labelMax.textContent = '100';
sliderLabels.appendChild(labelMax);

thresholdParticipantsContainer.appendChild(sliderLabels);


const thresholdTimeContainer = document.createElement('div');
thresholdTimeContainer.innerHTML = `<h2>Time Control</h2>`

export {
    minusThresholdBtn,
    plusThresholdBtn,
    setDefaultThresholdBtn,
    radioTabParticipants,
    radioTabTime,
    contentContainer,
    thresholdParticipantsContainer,
    slider,
    labelValue,
    thresholdTimeContainer,
};