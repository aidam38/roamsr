import { removeSelector, getIntervalHumanReadable } from "./helperFunctions";
import { loadCards } from "./loadingCards";
import { flagCard, stepToNext, responseHandler, goToCurrentCard } from "./mainFunctions";
import { getCurrentCard, startSession } from "./sessions";
import { showAnswerAndCloze } from "./styles";

// COMMON
export const getCounter = (state, deck) => {
	// Getting the number of new cards
	var cardCount = [0, 0];
	if (state.queue) {
		var remainingQueue = state.queue.slice(Math.max(state.currentIndex, 0));
		var filteredQueue = !deck ? remainingQueue : remainingQueue.filter((card) => card.decks.includes(deck));
		cardCount = filteredQueue.reduce(
			(a, card) => {
				if (card.isNew) a[0]++;
				else a[1]++;
				return a;
			},
			[0, 0]
		);
	}

	// Create the element
	var counter = Object.assign(document.createElement("div"), {
		className: "roamsr-counter",
		innerHTML:
			`<span style="color: dodgerblue; padding-right: 8px">` +
			cardCount[0] +
			`</span> <span style="color: green;">` +
			cardCount[1] +
			`</span>`,
	});
	return counter;
};

export const updateCounters = (state) => {
	document.querySelectorAll(".roamsr-counter").forEach((counter) => {
		counter.innerHTML = getCounter(state).innerHTML;
		counter.style.cssText = !state.limits ? "font-style: italic;" : "font-style: inherit;";
	});
};

// CONTAINER
export const addContainer = (state) => {
	if (!document.querySelector(".roamsr-container")) {
		var wrapper = Object.assign(document.createElement("div"), {
			className: "flex-h-box roamsr-wrapper",
		});
		var container = Object.assign(document.createElement("div"), {
			className: "flex-v-box roamsr-container",
		});

		var flagButtonContainer = Object.assign(document.createElement("div"), {
			className: "flex-h-box roamsr-flag-button-container",
		});
		var flagButton = Object.assign(document.createElement("button"), {
			className: "bp3-button roamsr-button",
			innerHTML: "Flag.",
			onclick: async () => {
				await flagCard();
				stepToNext();
			},
		});
		var skipButton = Object.assign(document.createElement("button"), {
			className: "bp3-button roamsr-button",
			innerHTML: "Skip.",
			onclick: stepToNext,
		});
		flagButtonContainer.style.cssText = "justify-content: space-between;";
		flagButtonContainer.append(flagButton, skipButton);

		var responseArea = Object.assign(document.createElement("div"), {
			className: "flex-h-box roamsr-container__response-area",
		});

		container.append(getCounter(state), responseArea, flagButtonContainer);
		wrapper.append(container);

		var bodyDiv = document.querySelector(".roam-body-main");
		bodyDiv.append(wrapper);
	}
};

export const removeContainer = () => {
	removeSelector(".roamsr-wrapper");
};

export const clearAndGetResponseArea = () => {
	var responseArea = document.querySelector(".roamsr-container__response-area");
	if (responseArea) responseArea.innerHTML = "";
	return responseArea;
};

export const addShowAnswerButton = () => {
	var responseArea = clearAndGetResponseArea();

	var showAnswerAndClozeButton = Object.assign(document.createElement("button"), {
		className: "bp3-button roamsr-container__response-area__show-answer-button roamsr-button",
		innerHTML: "Show answer.",
		onclick: () => {
			showAnswerAndCloze(false);
			addResponseButtons();
		},
	});
	showAnswerAndClozeButton.style.cssText = "margin: 5px;";

	responseArea.append(showAnswerAndClozeButton);
};

export const addResponseButtons = () => {
	var responseArea = clearAndGetResponseArea();

	// Add new responses
	var responses = getCurrentCard().algorithm(getCurrentCard().history);
	for (let response of responses) {
		const res = response;
		var responseButton = Object.assign(document.createElement("button"), {
			id: "roamsr-response-" + res.signal,
			className: "bp3-button roamsr-container__response-area__response-button roamsr-button",
			innerHTML: res.responseText + "<sup>" + getIntervalHumanReadable(res.interval) + "</sup>",
			onclick: async () => {
				if (res.interval != 0) {
					responseHandler(getCurrentCard(), res.interval, res.signal.toString());
				} else {
					await responseHandler(getCurrentCard(), res.interval, res.signal.toString());
				}
				stepToNext();
			},
		});
		responseButton.style.cssText = "margin: 5px;";
		responseArea.append(responseButton);
	}
};

// RETURN BUTTON
export const addReturnButton = () => {
	var returnButtonClass = "roamsr-return-button-container";
	if (document.querySelector(returnButtonClass)) return;

	var main = document.querySelector(".roam-main");
	var body = document.querySelector(".roam-body-main");
	var returnButtonContainer = Object.assign(document.createElement("div"), {
		className: "flex-h-box " + returnButtonClass,
	});
	var returnButton = Object.assign(document.createElement("button"), {
		className: "bp3-button bp3-large roamsr-return-button",
		innerText: "Return.",
		onclick: goToCurrentCard,
	});
	returnButtonContainer.append(returnButton);
	main.insertBefore(returnButtonContainer, body);
};

export const removeReturnButton = () => {
	removeSelector(".roamsr-return-button-container");
};

// SIDEBAR WIDGET
export const createWidget = () => {
	var widget = Object.assign(document.createElement("div"), {
		className: "log-button flex-h-box roamsr-widget",
	});
	widget.style.cssText = "align-items: center; justify-content: space-around; padding-top: 8px;";

	var reviewButton = Object.assign(document.createElement("div"), {
		className: "bp3-button bp3-minimal roamsr-widget__review-button",
		innerHTML: `<span style="padding-right: 8px;"><svg width="16" height="16" version="1.1" viewBox="0 0 4.2333 4.2333" style="color:5c7080;">
  <g id="chat_1_" transform="matrix(.26458 0 0 .26458 115.06 79.526)">
    <g transform="matrix(-.79341 0 0 -.88644 -420.51 -284.7)" fill="currentColor">
      <path d="m6 13.665c-1.1 0-2-1.2299-2-2.7331v-6.8327h-3c-0.55 0-1 0.61495-1 1.3665v10.932c0 0.7516 0.45 1.3665 1 1.3665h9c0.55 0 1-0.61495 1-1.3665l-5.04e-4 -1.5989v-1.1342h-0.8295zm9-13.665h-9c-0.55 0-1 0.61495-1 1.3665v9.5658c0 0.7516 0.45 1.3665 1 1.3665h9c0.55 0 1-0.61495 1-1.3665v-9.5658c0-0.7516-0.45-1.3665-1-1.3665z"
        clip-rule="evenodd" fill="currentColor" fill-rule="evenodd" />
    </g>
  </g></svg></span> REVIEW`,
		//  <span class="bp3-icon bp3-icon-chevron-down expand-icon"></span>`
		onclick: startSession,
	});
	reviewButton.style.cssText = "padding: 2px 8px;";

	var counter = Object.assign(getCounter(roamsr.state), {
		className: "bp3-button bp3-minimal roamsr-counter",
		onclick: async () => {
			roamsr.state.limits = !roamsr.state.limits;
			roamsr.state.queue = await loadCards(roamsr.settings);
			updateCounters(roamsr.state);
		},
	});
	var counterContainer = Object.assign(document.createElement("div"), {
		className: "flex-h-box roamsr-widget__counter",
	});
	counterContainer.style.cssText = "justify-content: center; width: 50%";
	counterContainer.append(counter);

	widget.append(reviewButton, counterContainer);

	return widget;
};

export const addWidget = () => {
	if (!document.querySelector(".roamsr-widget")) {
		removeSelector(".roamsr-widget-delimiter");
		var delimiter = Object.assign(document.createElement("div"), {
			className: "roamsr-widget-delimiter",
		});
		delimiter.style.cssText = "flex: 0 0 1px; background-color: rgb(57, 75, 89); margin: 8px 20px;";

		var widget = createWidget();

		var sidebar = document.querySelector(".roam-sidebar-content");
		var starredPages = document.querySelector(".starred-pages-wrapper");

		sidebar.insertBefore(delimiter, starredPages);
		sidebar.insertBefore(widget, starredPages);
	}
};
