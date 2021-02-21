/* roam/sr - Spaced Repetition in Roam Research
   Author: Adam Krivka
   v1.0.1
   https://github.com/aidam38/roamsr
 */

import { ankiScheduler } from "./ankiScheduler";
import {
	createUid,
	getFuckingDate,
	getIntervalHumanReadable,
	getRoamDate,
	goToUid,
	removeSelector,
	sleep,
} from "./helperFunctions";
import { addKeyListener, processKey, processKeyAlways, removeKeyListener } from "./keybindings";
import { loadCards } from "./loadingCards";
import { flagCard, goToCurrentCard, responseHandler, scheduleCardIn, stepToNext } from "./mainFunctions";
import { endSession, getCurrentCard, loadSettings, loadState, startSession } from "./sessions";
import { buttonClickHandler } from "./srButton";
import { addBasicStyles, setCustomStyle, showAnswerAndCloze } from "./styles";
import {
	addContainer,
	addResponseButtons,
	addReturnButton,
	addShowAnswerButton,
	addWidget,
	clearAndGetResponseArea,
	createWidget,
	getCounter,
	removeContainer,
	removeReturnButton,
	updateCounters,
} from "./uiElements";

var VERSION = "v1.0.1";

if (!window.roamsr) window.roamsr = {};

/* ====== SCHEDULERS / ALGORITHMS ====== */

roamsr.ankiScheduler = ankiScheduler;

/* ====== HELPER FUNCTIONS ====== */

roamsr.sleep = sleep;

roamsr.createUid = createUid;

roamsr.removeSelector = removeSelector;

roamsr.goToUid = goToUid;

roamsr.getFuckingDate = getFuckingDate;

roamsr.getRoamDate = getRoamDate;

roamsr.getIntervalHumanReadable = getIntervalHumanReadable;

/* ====== LOADING CARDS ====== */

roamsr.loadCards = loadCards;

/* ====== STYLES ====== */

roamsr.addBasicStyles = addBasicStyles;

roamsr.setCustomStyle = setCustomStyle;

roamsr.showAnswerAndCloze = showAnswerAndCloze;

/* ====== MAIN FUNCTIONS ====== */

roamsr.scheduleCardIn = scheduleCardIn;

roamsr.responseHandler = responseHandler;

roamsr.flagCard = flagCard;

roamsr.stepToNext = stepToNext;

roamsr.goToCurrentCard = goToCurrentCard;

/* ====== SESSIONS ====== */

roamsr.loadSettings = loadSettings;

roamsr.loadState = loadState;

roamsr.getCurrentCard = getCurrentCard;

roamsr.startSession = startSession;

roamsr.endSession = endSession;

/* ====== UI ELEMENTS ====== */

// COMMON
roamsr.getCounter = getCounter;

roamsr.updateCounters = updateCounters;

// CONTAINER
roamsr.addContainer = addContainer;

roamsr.removeContainer = removeContainer;

roamsr.clearAndGetResponseArea = clearAndGetResponseArea;

roamsr.addShowAnswerButton = addShowAnswerButton;

roamsr.addResponseButtons = addResponseButtons;

// RETURN BUTTON
roamsr.addReturnButton = addReturnButton;

roamsr.removeReturnButton = removeReturnButton;

// SIDEBAR WIDGET
roamsr.createWidget = createWidget;

roamsr.addWidget = addWidget;

/* ====== KEYBINDINGS ====== */
roamsr.processKey = processKey;

roamsr.processKeyAlways = processKeyAlways;

roamsr.addKeyListener = addKeyListener;

roamsr.removeKeyListener = removeKeyListener;

/* ====== {{sr}} BUTTON ====== */
roamsr.buttonClickHandler = buttonClickHandler;

document.addEventListener("click", roamsr.buttonClickHandler, false);

/* ====== CALLING FUNCTIONS DIRECTLY ====== */

console.log("🗃️ Loading roam/sr " + VERSION + ".");

roamsr.loadSettings();
roamsr.addBasicStyles();
roamsr.loadState(-1).then((res) => {
	roamsr.addWidget();
});

console.log("🗃️ Successfully loaded roam/sr " + VERSION + ".");
