export const processKey = (e) => {
	// console.log("alt: " + e.altKey + "  shift: " + e.shiftKey + "  ctrl: " + e.ctrlKey + "   code: " + e.code + "   key: " + e.key);
	if (document.activeElement.type == "textarea" || !location.href.includes(roamsr.getCurrentCard().uid)) {
		return;
	}

	var responses = roamsr.getCurrentCard().algorithm(roamsr.getCurrentCard().history);
	var handleNthResponse = async (n) => {
		console.log("Handling response: " + n);
		if (n >= 0 && n < responses.length) {
			const res = responses[n];
			if (res.interval != 0) {
				roamsr.responseHandler(roamsr.getCurrentCard(), res.interval, res.signal.toString());
			} else {
				await roamsr.responseHandler(roamsr.getCurrentCard(), res.interval, res.signal.toString());
			}
			roamsr.stepToNext();
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
		roamsr.showAnswerAndCloze(false);
		roamsr.addResponseButtons();
		return;
	}

	if (e.code == "KeyF") {
		roamsr.flagCard().then(() => {
			roamsr.stepToNext();
		});
		return;
	}

	if (e.code == "KeyS") {
		roamsr.stepToNext();
		return;
	}

	if (e.code == "KeyD" && e.altKey) {
		roamsr.endSession();
		return;
	}
};

export const processKeyAlways = (e) => {
	// Alt+enter TODO
};

export const addKeyListener = () => {
	document.addEventListener("keydown", roamsr.processKey);
};

export const removeKeyListener = () => {
	document.removeEventListener("keydown", roamsr.processKey);
};
