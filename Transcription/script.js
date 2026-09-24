const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const clearButton = document.getElementById("clearButton");

const transcript = document.getElementById("transcript");
const statusText = document.getElementById("status");
const factCheckBox = document.getElementById("factCheck");
const factStatus = document.getElementById("factStatus");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

async function factCheckText(text) {

  if (!text.trim()) {
    return;
  }

  factStatus.textContent = "Checking claim...";

  factCheckBox.textContent = "";

  try {

    const response = await fetch(
      "http://localhost:3000/fact-check",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          text: text,
        }),
      }
    );

    const data = await response.json();

    if (data.factCheck) {

      factCheckBox.textContent = data.factCheck;

      factStatus.textContent = "Fact check complete.";

    } else {

      factStatus.textContent = "Could not check statement.";

    }

  } catch (error) {

    console.error(error);

    factStatus.textContent =
      "Could not connect to fact-checking server.";

  }
}

if (!SpeechRecognition) {
  statusText.textContent =
    "Speech recognition is not supported in this browser.";
} else {
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let finalTranscript = "";

  recognition.onstart = function () {
    statusText.textContent = "Listening...";
    startButton.disabled = true;
  };

  recognition.onresult = function (event) {

  let temporaryTranscript = "";

  for (
    let i = event.resultIndex;
    i < event.results.length;
    i++
  ) {

    const words =
      event.results[i][0].transcript;

    if (event.results[i].isFinal) {

      finalTranscript += words + " ";

      console.log("Final speech:", words);

      factCheckText(words);

    } else {

      temporaryTranscript += words;

    }
  }

  transcript.innerHTML =
    finalTranscript +
    '<span style="color: gray;">' +
    temporaryTranscript +
    "</span>";
};

  recognition.onerror = function (event) {
    statusText.textContent =
      "Error: " + event.error;

    startButton.disabled = false;
  };

  recognition.onend = function () {
    statusText.textContent = "Microphone stopped.";
    startButton.disabled = false;
  };

  startButton.addEventListener("click", function () {
    recognition.start();
  });

  stopButton.addEventListener("click", function () {
    recognition.stop();
  });

  clearButton.addEventListener("click", function () {
    finalTranscript = "";
    transcript.innerHTML = "";
  });
}