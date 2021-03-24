import { removeSelector, goToUid, sleep } from "./helperFunctions";
import { addKeyListener, removeKeyListener } from "./keybindings";
import { loadCards } from "./loadingCards";
import { goToCurrentCard } from "./mainFunctions";
import { setCards, setCurrentCardIndex, setLimitActivation, standbyState } from "./state";
import { setCustomStyle, removeCustomStyle, removeRoamsrMainviewCSS } from "../ui/styles";
import { addWidget, removeContainer, removeReturnButton, updateCounters } from "../ui/uiElements";

const defaultSettings = {
	closeLeftSideBar: true,
	startWithNewCards: true,
	mainTags: ["sr"],
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

export const loadSettings = () => {
	roamsr.settings = Object.assign(defaultSettings, window.roamsrUserSettings);
	if (roamsr.settings.mainTag) {
		roamsr.settings.mainTags = [roamsr.settings.mainTag];
	}
};

export const loadState = async (i) => {
	setLimitActivation(true);
	setCurrentCardIndex(i);
	const { cards, extraCards } = await loadCards(roamsr.state.limits, roamsr.settings, window.roamAlphaAPI.q);
	setCards(cards, extraCards);
	updateCounters(roamsr.state);
	return;
};

export const getCurrentCard = () => {
	var card = roamsr.state.queue[roamsr.state.currentIndex];
	return card ? card : {};
};

export const startSession = async () => {
	if (roamsr.state) {
		loadSettings();
		await loadState(0);

		if (roamsr.state.queue.length > 0) {
			console.log("Starting session.");

			setCustomStyle();

			if (roamsr.settings.closeLeftSideBar) {
				// close left sidebar
				try {
					document.getElementsByClassName("bp3-icon-menu-closed")[0].click();
					// note: currently the button for opening the sidebar is only clickable
					// if we hover over it
					// hover-events apparently cant be faked easily
					// (https://stackoverflow.com/questions/17226676/how-do-i-simulate-a-mouseover-in-pure-javascript-that-activates-the-css-hover)
					// so we just offer the setting-option for now
					// at some point the API might include the left sidebar and not only the right
					// then we could offer re-opening the left sidebar after the session
				} catch (e) { }
			}

			console.log("The queue: ");
			console.log(roamsr.state.queue);

			await goToCurrentCard();

			addKeyListener();

			// Change widget
			var widget = document.querySelector(".roamsr-widget");
			widget.innerHTML =
				"<div style='padding: 5px 0px'><span class='bp3-icon bp3-icon-cross'></span> END SESSION</div>";
			widget.onclick = endSession;
		}
	}
};

export const endSession = async () => {
	window.onhashchange = () => { };
	console.log("Ending sesion.");

	standbyState();

	// Change widget
	removeSelector(".roamsr-widget");
	addWidget();

	// Remove elements
	var doStuff = async () => {
		removeContainer();
		removeReturnButton();
		removeCustomStyle();
		removeRoamsrMainviewCSS();
		removeKeyListener();
		goToUid();

		await loadState(-1);
	};

	await doStuff();
	await sleep(200);
	await doStuff(); // ... again to make sure
	await sleep(1000);
	await loadState(-1);
};
