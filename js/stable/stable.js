/* roam/sr - Spaced Repetition in Roam Research
   Author: Adam Krivka
   v1.0.1
   https://github.com/aidam38/roamsr
 */

import { loadSettings, loadState } from "./sessions";
import { buttonClickHandler } from "./srButton";
import { addBasicStyles } from "./styles";
import { addWidget } from "./uiElements";

export const init = () => {
	var VERSION = "v1.0.1";

	if (!window.roamsr) window.roamsr = {};

	document.addEventListener("click", buttonClickHandler, false);

	console.log("🗃️ Loading roam/sr " + VERSION + ".");

	loadSettings();
	addBasicStyles();
	loadState(-1).then(() => {
		addWidget();
	});

	console.log("🗃️ Successfully loaded roam/sr " + VERSION + ".");
};

init();
