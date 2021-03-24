import { flagCard, responseHandler, stepToNext } from "./mainFunctions";
import { endSession, getCurrentCard } from "./sessions";
import { showAnswerAndCloze } from "../ui/styles";
import { addResponseButtons } from "../ui/uiElements";

const questionAndAnswerCodeMap = {
	KeyF: flagCard,
	KeyS: (e) => {
		if (!e.ctrlKey && !e.shiftKey) stepToNext();
	},
	KeyD: (e) => {
		// TODO: this does not work in any version because alt+d is opening the daily page
		if (e.altKey) endSession();
	},
};

const questionCodeMap = {
	Space: () => {
		showAnswerAndCloze();
		addResponseButtons();
	},
	...questionAndAnswerCodeMap,
};

const handleNthResponse = async (n, responses) => {
	console.log("Handling response: " + n);
	// TODO: we shouldnt need to check for having responses because we are in the answer-state
	if (n >= 0) {
		const res = responses[n];
		await responseHandler(getCurrentCard(), res.interval, res.signal.toString());
		await stepToNext();
	}
};

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const handleDigitResponse = (digit) => {
	var responses = getCurrentCard().algorithm(getCurrentCard().history);
	var n = Math.min(digit - 1, responses.length - 1);
	handleNthResponse(n, responses);
};
const digitsCodeMap = Object.fromEntries(digits.map((digit) => ["Digit" + digit, () => handleDigitResponse(digit)]));

const letters = ["KeyH", "KeyJ", "KeyK", "KeyL"];
const handleLetterResponse = (letter) => {
	var responses = getCurrentCard().algorithm(getCurrentCard().history);
	var n = Math.min(letters.indexOf(letter), responses.length - 1);
	handleNthResponse(n, responses);
};
const lettersCodeMap = Object.fromEntries(letters.map((letter) => [letter, () => handleLetterResponse(letter)]));

const answerCodeMap = {
	...digitsCodeMap,
	...lettersCodeMap,
	...questionAndAnswerCodeMap,
	Space: () => handleDigitResponse(3),
};

const statusCodeMaps = { question: questionCodeMap, answer: answerCodeMap };

// note: changing these requires reloading Roam because of the keylistener
export const processKey = (e) => {
	// if we are editing, dont process
	if (document.activeElement.type === "textarea" || document.activeElement.type === "input") return;

	// this is not be necessary anymore because we have status
	// !location.href.includes(getCurrentCard().uid)

	const statusCodeMap = statusCodeMaps[roamsr.state.status];
	if (statusCodeMap) {
		const func = statusCodeMap[e.code];
		if (func) {
			func(e);
		}
	}
};

export const processKeyAlways = (e) => {
	// TODO: Alt+enter
};

export const addKeyListener = () => {
	document.addEventListener("keydown", processKey);
};

export const removeKeyListener = () => {
	document.removeEventListener("keydown", processKey);
};
