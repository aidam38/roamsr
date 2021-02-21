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
	roamsr.state.queue = await roamsr.loadCards();
	return;
};

export const getCurrentCard = () => {
	var card = roamsr.state.queue[roamsr.state.currentIndex];
	return card ? card : {};
};

export const startSession = async () => {
	if (roamsr.state && roamsr.state.queue.length > 0) {
		console.log("Starting session.");

		roamsr.setCustomStyle(true);

		// Hide left sidebar
		try {
			document.getElementsByClassName("bp3-icon-menu-closed")[0].click();
		} catch (e) {}

		roamsr.loadSettings();
		await roamsr.loadState(0);

		console.log("The queue: ");
		console.log(roamsr.state.queue);

		await roamsr.goToCurrentCard();

		roamsr.addKeyListener();

		// Change widget
		var widget = document.querySelector(".roamsr-widget");
		widget.innerHTML = "<div style='padding: 5px 0px'><span class='bp3-icon bp3-icon-cross'></span> END SESSION</div>";
		widget.onclick = roamsr.endSession;
	}
};

export const endSession = async () => {
	window.onhashchange = () => {};
	console.log("Ending sesion.");

	// Change widget
	roamsr.removeSelector(".roamsr-widget");
	roamsr.addWidget();

	// Remove elements
	var doStuff = async () => {
		roamsr.removeContainer();
		roamsr.removeReturnButton();
		roamsr.setCustomStyle(false);
		roamsr.showAnswerAndCloze(false);
		roamsr.removeKeyListener();
		roamsr.goToUid();

		await roamsr.loadState(-1);
		roamsr.updateCounters();
	};

	await doStuff();
	await roamsr.sleep(200);
	await doStuff(); // ... again to make sure
	await roamsr.sleep(1000);
	await roamsr.loadState(-1);
	roamsr.updateCounters(); // ... once again
};
