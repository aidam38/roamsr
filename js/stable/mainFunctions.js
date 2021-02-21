export const scheduleCardIn = async (card, interval) => {
	var nextDate = new Date();
	nextDate.setDate(nextDate.getDate() + interval);

	var nextRoamDate = roamsr.getRoamDate(nextDate);

	// Create daily note if it doesn't exist yet
	await window.roamAlphaAPI.createPage({
		page: {
			title: nextRoamDate.title,
		},
	});

	await roamsr.sleep();

	// Query for the [[roam/sr/review]] block
	var queryReviewBlock = window.roamAlphaAPI.q(
		'[:find (pull ?reviewBlock [:block/uid]) :in $ ?dailyNoteUID :where [?reviewBlock :block/refs ?reviewPage] [?reviewPage :node/title "roam/sr/review"] [?dailyNote :block/children ?reviewBlock] [?dailyNote :block/uid ?dailyNoteUID]]',
		nextRoamDate.uid
	);

	// Check if it's there; if not, create it
	var topLevelUid;
	if (queryReviewBlock.length == 0) {
		topLevelUid = roamsr.createUid();
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
		await roamsr.sleep();
	} else {
		topLevelUid = queryReviewBlock[0][0].uid;
	}

	// Generate the block
	var block = {
		uid: roamsr.createUid(),
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
	await roamsr.sleep();

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
		var todayReviewBlock = await roamsr.scheduleCardIn(card, 0);
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
	var nextReview = await roamsr.scheduleCardIn(card, interval);
	hist.push(nextReview);

	// If it's scheduled for today, add it to the end of the queue
	if (interval == 0) {
		var newCard = card;
		newCard.history = hist;
		newCard.isNew = false;
		roamsr.state.queue.push(newCard);
	}
};

export const flagCard = () => {
	var card = roamsr.getCurrentCard();
	window.roamAlphaAPI.updateBlock({
		block: {
			uid: card.uid,
			string: card.string + " #" + roamsr.settings.flagTag,
		},
	});

	var j = roamsr.getCurrentCard().isNew ? 0 : 1;

	var extraCard = roamsr.state.extraCards[j].shift();
	if (extraCard) roamsr.state.queue.push(extraCard);
};

export const stepToNext = async () => {
	if (roamsr.state.currentIndex + 1 >= roamsr.state.queue.length) {
		roamsr.endSession();
	} else {
		roamsr.state.currentIndex++;
		roamsr.goToCurrentCard();
	}
	roamsr.updateCounters();
};

export const goToCurrentCard = async () => {
	window.onhashchange = () => {};
	roamsr.showAnswerAndCloze(true);
	roamsr.removeReturnButton();
	var doStuff = async () => {
		roamsr.goToUid(roamsr.getCurrentCard().uid);
		await roamsr.sleep(50);
		roamsr.addContainer();
		roamsr.addShowAnswerButton();
	};

	await doStuff();
	window.onhashchange = doStuff;

	await roamsr.sleep(500);

	await doStuff();

	window.onhashchange = () => {
		roamsr.removeContainer();
		roamsr.addReturnButton();
		roamsr.showAnswerAndCloze(false);
		window.onhashchange = () => {};
	};
};
