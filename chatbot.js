document.addEventListener('DOMContentLoaded', function () {
    const chatbotContainer = document.querySelector('.chatbot');
    const chatbotToggler = document.querySelector('.chatbot-toggler');
    const closeBtn = document.querySelector('.close-btn');

    let chatStage = 0;
    let userName = "";
    let initialSymptom = "";
    let numDays = 0;
    let symptomsGiven = [];
    let additionalSymptoms = [];

    function toggleChatbot() {
        document.body.classList.toggle('show-chatbot');
    }

    chatbotToggler.addEventListener('click', function () {
        toggleChatbot();
    });

    closeBtn.addEventListener('click', function () {
        toggleChatbot();
    });

    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatbox = document.querySelector('.chatbox');
    const typingIndicator = document.getElementById('typing-indicator');

    function addChatMessage(message, isIncoming = false) {
        const chatMessage = document.createElement('li');
        chatMessage.classList.add('chat', isIncoming ? 'incoming' : 'outgoing');
        const messageSpan = document.createElement('span');
        messageSpan.classList.add('material-symbols-outlined');
        messageSpan.textContent = isIncoming ? 'smart_toy' : 'person';
        chatMessage.appendChild(messageSpan);
        const messageP = document.createElement('p');
        messageP.innerHTML = message.replace(/\n/g, '<br>');
        chatMessage.appendChild(messageP);
        chatbox.appendChild(chatMessage);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    function simulateIncomingMessage(userMessage) {
        console.log("Current chat stage:", chatStage);
        setTimeout(() => {
            typingIndicator.style.display = 'none';
            let responseMessage = "";

            switch (chatStage) {
                case 0:
                    userName = userMessage;
                    responseMessage = `Hello, ${userName}. What symptom are you experiencing?`;
                    chatStage++;
                    break;
                case 1:
                    initialSymptom = userMessage;
                    responseMessage = `You mentioned ${initialSymptom}. How many days have you been experiencing this symptom?`;
                    chatStage++;
                    break;
                case 2:
                    numDays = parseInt(userMessage);
                    if (isNaN(numDays) || numDays <= 0) {
                        responseMessage = "Please enter a valid number of days.";
                    } else {
                        console.log('Fetching additional symptoms for:', initialSymptom);
                        getAdditionalSymptoms(initialSymptom);
                        return; // Exit this function to wait for symptoms to load
                    }
                    break;
                case 3:
                    if (userMessage.toLowerCase() === 'yes') {
                        additionalSymptoms.push(symptomsGiven[additionalSymptoms.length]);
                    }

                    if (additionalSymptoms.length < symptomsGiven.length) {
                        responseMessage = `Are you experiencing ${symptomsGiven[additionalSymptoms.length]}? (yes/no)`;
                    } else {
                        completeDiagnosis();
                        return; // Exit the function to wait for the diagnosis
                    }
                    break;
                default:
                    responseMessage = "Sorry, I didn't understand that.";
            }

            console.log("Response:", responseMessage);
            addChatMessage(responseMessage, true);
        }, 1000);
    }

    sendBtn.addEventListener('click', function () {
        const message = userInput.value.trim();
        if (message) {
            addChatMessage(message);
            userInput.value = '';
            typingIndicator.style.display = 'block';
            simulateIncomingMessage(message);
        }
    });

    userInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendBtn.click();
        }
    });

    function getAdditionalSymptoms(symptom) {
        const url = `http://localhost:8000/get_symptoms?symptom=${encodeURIComponent(symptom)}`;
        console.log('Fetching from URL:', url);
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('Received additional symptoms:', data);
                symptomsGiven = data.symptoms;
                if (symptomsGiven.length > 0) {
                    addChatMessage(`Are you experiencing ${symptomsGiven[0]}? (yes/no)`, true);
                    chatStage++;
                } else {
                    addChatMessage("No additional symptoms found.", true);
                    completeDiagnosis();
                }
            })
            .catch(error => {
                console.error('Error fetching additional symptoms:', error);
                addChatMessage("Sorry, I couldn't retrieve additional symptoms. Please try again.", true);
            });
    }

    function completeDiagnosis() {
        const payload = {
            additionalSymptoms,
            numDays
        };

        fetch('http://localhost:8000/complete_diagnosis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                addChatMessage(data.diagnosis, true);
                if (data.diagnosis === data.second_prediction) {
                    addChatMessage(data.description, true);
                    addChatMessage("Take the following measures: ", true);
                    data.precautions.forEach((precaution, index) => {
                        addChatMessage(`${index + 1}) ${precaution}`, true);
                    });
                } else {
                    addChatMessage(`You may have ${data.diagnosis} or ${data.second_prediction}`, true);
                    addChatMessage(data.description1, true);
                    addChatMessage(data.description2, true);
                    addChatMessage("Take the following measures: ", true);
                    data.precautions1.forEach((precaution, index) => {
                        addChatMessage(`${index + 1}) ${precaution}`, true);
                    });
                }
            })
            .catch(error => {
                console.error('Error completing diagnosis:', error);
                addChatMessage("Sorry, I couldn't complete the diagnosis. Please try again.", true);
            });
    }

    function getSeverityDict() {
        fetch('http://localhost:8000/Symptom_severity.csv')
            .then(response => response.text())
            .then(data => {
                const rows = data.split('\n');
                rows.forEach(row => {
                    const [symptom, severity] = row.split(',');
                    severityDictionary[symptom.trim()] = parseInt(severity.trim());
                });
            })
            .catch(error => {
                console.error('Error fetching severity dictionary:', error);
            });
    }

    function getDescription() {
        fetch('http://localhost:8000/symptom_Description.csv')
            .then(response => response.text())
            .then(data => {
                const rows = data.split('\n');
                rows.forEach(row => {
                    const [symptom, description] = row.split(',');
                    descriptionList[symptom.trim()] = description.trim();
                });
            })
            .catch(error => {
                console.error('Error fetching descriptions:', error);
            });
    }

    function getPrecautionDict() {
        fetch('http://localhost:8000/symptom_precaution.csv')
            .then(response => response.text())
            .then(data => {
                const rows = data.split('\n');
                rows.forEach(row => {
                    const [symptom, ...precautions] = row.split(',');
                    precautionDictionary[symptom.trim()] = precautions.map(p => p.trim());
                });
            })
            .catch(error => {
                console.error('Error fetching precautions:', error);
            });
    }

    function getInfo() {
        addChatMessage("HealthCare ChatBot! Your personal Assistant", true);
        addChatMessage("\nYour Name? \t\t\t\t", true);
    }

    // Ensure these functions are called once the document is fully loaded
    getSeverityDict();
    getDescription();
    getPrecautionDict();
    getInfo();
});
