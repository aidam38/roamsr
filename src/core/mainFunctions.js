import { getRoamDate, sleep, createUid, goToUid } from "./helperFunctions";
import { getCurrentCard, endSession } from "./sessions";
import {
	addCardToQueue,
	addExtraCardToQueue,
	incrementCurrentCardIndex,
	inquiryState,
	questionState,
	standbyState,
} from "./state";
import { hideAnswerAndCloze, removeRoamsrMainviewCSS } from "../ui/styles";
import {
	updateCounters,
	removeReturnButton,
	addContainer,
	addShowAnswerButton,
	removeContainer,
	addReturnButton,
} from "../ui/uiElements";

export const scheduleCardIn = async (card, interval) => {
	var nextDate = new Date();
	nextDate.setDate(nextDate.getDate() + interval);

	var nextRoamDate = getRoamDate(nextDate);

	// Create daily note if it doesn't exist yet
	await window.roamAlphaAPI.createPage({
		page: {
			title: nextRoamDate.title,
		},
	});

	await sleep();

	// Query for the [[roam/sr/review]] block
	var queryReviewBlock = window.roamAlphaAPI.q(
		'[:find (pull ?reviewBlock [:block/uid]) :in $ ?dailyNoteUID :where [?reviewBlock :block/refs ?reviewPage] [?reviewPage :node/title "roam/sr/review"] [?dailyNote :block/children ?reviewBlock] [?dailyNote :block/uid ?dailyNoteUID]]',
		nextRoamDate.uid
	);

	// Check if it's there; if not, create it
	var topLevelUid;
	if (queryReviewBlock.length == 0) {
		topLevelUid = createUid();
		await window.roamAlphaAPI.createBlock({
			location: {
				"parent-uid": nextRoamDate.uid,
				order: 0,
			},
			block: {
				string: "[[roam/sr/review]]",
				uid: topLevelUid,
			},
		});
		await sleep();
	} else {
		topLevelUid = queryReviewBlock[0][0].uid;
	}

	// Generate the block
	var block = {
		uid: createUid(),
		string: "((" + card.uid + "))",
	};
	// Finally, schedule the card
	await window.roamAlphaAPI.createBlock({
		location: {
			"parent-uid": topLevelUid,
			order: 0,
		},
		block: block,
	});
	await sleep();

	return {
		date: nextRoamDate.uid,
		signal: null,
		uid: block.uid,
		string: block.string,
	};
};

export const responseHandler = async (card, interval, signal) => {
	console.log("Signal: " + signal + ", Interval: " + interval);
	var hist = card.history;

	// If new card, make it look like it was scheduled for today
	if (hist.length == 0 || (hist[hist.length - 1] && hist[hist.length - 1].date !== new Date())) {
		var last = hist.pop();
		if (last) {
			await window.roamAlphaAPI.deleteBlock({
				block: {
					uid: last.uid,
				},
			});
		}
		var todayReviewBlock = await scheduleCardIn(card, 0);
		hist.push(todayReviewBlock);
	}

	// Record response
	var last = hist.pop();
	last.string = last.string + " #[[r/" + signal + "]]";
	last.signal = signal;
	await window.roamAlphaAPI.updateBlock({
		block: {
			uid: last.uid,
			string: last.string,
		},
	});
	hist.push(last);

	// Schedule card to future
	var nextReview = await scheduleCardIn(card, interval);
	hist.push(nextReview);

	// If it's scheduled for today, add it to the end of the queue
	if (interval == 0) {
		var newCard = card;
		newCard.history = hist;
		newCard.isNew = false;
		addCardToQueue(newCard);
	}
};

export const flagCard = async () => {
	const card = getCurrentCard();

	await window.roamAlphaAPI.updateBlock({
		block: {
			uid: card.uid,
			string: card.string + " #" + roamsr.settings.flagTag,
		},
	});

	const j = getCurrentCard().isNew ? 0 : 1;

	addExtraCardToQueue(j);

	await stepToNext();
};

export const stepToNext = async () => {
	if (roamsr.state.currentIndex + 1 >= roamsr.state.queue.length) {
		endSession();
	} else {
		incrementCurrentCardIndex();
		goToCurrentCard();
	}
	updateCounters(roamsr.state);
};

export const goToCurrentCard = async () => {
	// change to standby first to prevent unwanted key processing
	standbyState();

	window.onhashchange = () => {};
	hideAnswerAndCloze();
	removeReturnButton();

	goToUid(getCurrentCard().uid);
	await sleep(50);
	addContainer(roamsr.state);
	addShowAnswerButton();

	window.onhashchange = () => {
		inquiryState();
		removeContainer();
		addReturnButton();
		removeRoamsrMainviewCSS();
		window.onhashchange = () => {};
	};

	questionState();
};
