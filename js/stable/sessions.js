import { removeSelector, goToUid, sleep } from "./helperFunctions";
import { addKeyListener, removeKeyListener } from "./keybindings";
import { loadCards } from "./loadingCards";
import { goToCurrentCard } from "./mainFunctions";
import { setCustomStyle, showAnswerAndCloze } from "./styles";
import { addWidget, removeContainer, removeReturnButton, updateCounters } from "./uiElements";

export const loadSettings = () => {
	// Default settings
	roamsr.settings = {
		mainTag: "sr",
		flagTag: "f",
		clozeStyle: "highlight", // "highlight" or "block-ref"
		defaultDeck: {
			algorithm: null,
			config: {},
			newCardLimit: 20,
			reviewLimit: 100,
		},
		customDecks: [],
	};
	roamsr.settings = Object.assign(roamsr.settings, window.roamsrUserSettings);
};

export const loadState = async (i) => {
	roamsr.state = {
		limits: true,
		currentIndex: i,
	};
	roamsr.state.queue = await loadCards();
	return;
};

export const getCurrentCard = () => {
	var card = roamsr.state.queue[roamsr.state.currentIndex];
	return card ? card : {};
};

export const startSession = async () => {
	if (roamsr.state && roamsr.state.queue.length > 0) {
		console.log("Starting session.");

		setCustomStyle(true);

		// Hide left sidebar
		try {
			document.getElementsByClassName("bp3-icon-menu-closed")[0].click();
		} catch (e) {}

		loadSettings();
		await loadState(0);

		console.log("The queue: ");
		console.log(roamsr.state.queue);

		await goToCurrentCard();

		addKeyListener();

		// Change widget
		var widget = document.querySelector(".roamsr-widget");
		widget.innerHTML = "<div style='padding: 5px 0px'><span class='bp3-icon bp3-icon-cross'></span> END SESSION</div>";
		widget.onclick = endSession;
	}
};

export const endSession = async () => {
	window.onhashchange = () => {};
	console.log("Ending sesion.");

	// Change widget
	removeSelector(".roamsr-widget");
	addWidget();

	// Remove elements
	var doStuff = async () => {
		removeContainer();
		removeReturnButton();
		setCustomStyle(false);
		showAnswerAndCloze(false);
		removeKeyListener();
		goToUid();

		await loadState(-1);
		updateCounters();
	};

	await doStuff();
	await sleep(200);
	await doStuff(); // ... again to make sure
	await sleep(1000);
	await loadState(-1);
	updateCounters(); // ... once again
};