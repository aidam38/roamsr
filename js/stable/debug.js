import { ankiScheduler } from "./ankiScheduler";
import {
	sleep,
	createUid,
	removeSelector,
	goToUid,
	dailyPageUIDToCrossBrowserDate,
	getRoamDate,
	getIntervalHumanReadable,
} from "./helperFunctions";
import { processKey, processKeyAlways, addKeyListener, removeKeyListener } from "./keybindings";
import { loadCards } from "./loadingCards";
import { scheduleCardIn, responseHandler, flagCard, stepToNext, goToCurrentCard } from "./mainFunctions";
import { loadSettings, loadState, getCurrentCard, startSession, endSession } from "./sessions";
import { buttonClickHandler } from "./srButton";

// need this to force execution
import { init } from "./stable";

import { addBasicStyles, setCustomStyle, showAnswerAndCloze } from "./styles";
import {
	getCounter,
	updateCounters,
	addContainer,
	removeContainer,
	clearAndGetResponseArea,
	addShowAnswerButton,
	addResponseButtons,
	addReturnButton,
	removeReturnButton,
	createWidget,
	addWidget,
} from "./uiElements";

export const exposeInternalAPI = () => {
	/* ====== SCHEDULERS / ALGORITHMS ====== */

	roamsr.ankiScheduler = ankiScheduler;

	/* ====== HELPER FUNCTIONS ====== */

	roamsr.sleep = sleep;

	roamsr.createUid = createUid;

	roamsr.removeSelector = removeSelector;

	roamsr.goToUid = goToUid;

	roamsr.dailyPageUIDToCrossBrowserDate = dailyPageUIDToCrossBrowserDate;

	roamsr.getRoamDate = getRoamDate;

	roamsr.getIntervalHumanReadable = getIntervalHumanReadable;

	/* ====== LOADING CARDS ====== */

	// TODO: access
	roamsr.loadCards = () => loadCards(roamsr.state.limits, roamsr.settings, window.roamAlphaAPI.q);

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
	// TODO: access
	roamsr.getCounter = (deck) => getCounter(roamsr.state, deck);

	// TODO: access
	roamsr.updateCounters = () => updateCounters(roamsr.state);

	// CONTAINER
	// TODO: access
	roamsr.addContainer = () => addContainer(roamsr.state);

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
};

exposeInternalAPI();
