import { flagCard, responseHandler, stepToNext } from "./mainFunctions";
import { endSession, getCurrentCard } from "./sessions";
import { showAnswerAndCloze } from "./styles";
import { addResponseButtons } from "./uiElements";

export const processKey = (e) => {
	// console.log("alt: " + e.altKey + "  shift: " + e.shiftKey + "  ctrl: " + e.ctrlKey + "   code: " + e.code + "   key: " + e.key);
	if (document.activeElement.type == "textarea" || !location.href.includes(getCurrentCard().uid)) {
		return;
	}

	var responses = getCurrentCard().algorithm(getCurrentCard().history);
	var handleNthResponse = async (n) => {
		console.log("Handling response: " + n);
		if (n >= 0 && n < responses.length) {
			const res = responses[n];
			if (res.interval != 0) {
				responseHandler(getCurrentCard(), res.interval, res.signal.toString());
			} else {
				await responseHandler(getCurrentCard(), res.interval, res.signal.toString());
			}
			stepToNext();
		}
	};

	// Bindings for 123456789
	if (e.code.includes("Digit")) {
		var n = Math.min(parseInt(e.code.replace("Digit", "")) - 1, responses.length - 1);
		handleNthResponse(n);
		return;
	}

	// Bindings for hjkl
	const letters = ["KeyH", "KeyJ", "KeyK", "KeyL"];
	if (letters.includes(e.code)) {
		var n = Math.min(letters.indexOf(e.code), responses.length - 1);
		handleNthResponse(n);
		return;
	}

	if (e.code == "Space") {
		showAnswerAndCloze();
		addResponseButtons();
		return;
	}

	if (e.code == "KeyF") {
		// TODO: bug flagCard returns void!
		flagCard().then(() => {
			stepToNext();
		});
		return;
	}

	if (e.code == "KeyS") {
		stepToNext();
		return;
	}

	if (e.code == "KeyD" && e.altKey) {
		endSession();
		return;
	}
};

export const processKeyAlways = (e) => {
	// Alt+enter TODO
};

export const addKeyListener = () => {
	document.addEventListener("keydown", processKey);
};

export const removeKeyListener = () => {
	document.removeEventListener("keydown", processKey);
};
