import { ankiScheduler } from "./ankiScheduler";
import { getFuckingDate, getRoamDate } from "./helperFunctions";

const recurDeck = (part) => {
	var result = [];
	if (part.refs) result.push(...part.refs);
	if (part._children && part._children.length > 0) result.push(...recurDeck(part._children[0]));
	return result;
};

export const loadCards = async (limits, dateBasis = new Date()) => {
	// Common functions
	var getDecks = (res) => {
		var possibleDecks = recurDeck(res).map((deck) => deck.title);
		return possibleDecks.filter((deckTag) =>
			roamsr.settings.customDecks.map((customDeck) => customDeck.tag).includes(deckTag)
		);
	};

	var getAlgorithm = (res) => {
		let decks = getDecks(res);
		let preferredDeck;
		let algorithm;

		if (decks && decks.length > 0) {
			preferredDeck = roamsr.settings.customDecks.filter((customDeck) => customDeck.tag == decks[decks.length - 1])[0];
		} else preferredDeck = roamsr.settings.defaultDeck;

		let scheduler = preferredDeck.scheduler || preferredDeck.algorithm;
		let config = preferredDeck.config;
		if (!scheduler || scheduler === "anki") {
			algorithm = ankiScheduler(config);
		} else algorithm = scheduler(config);

		return algorithm;
	};

	var isNew = (res) => {
		return res._refs
			? !res._refs.some((review) => {
					var reviewDate = new Date(getFuckingDate(review.page.uid));
					reviewDate.setDate(reviewDate.getDate() + 1);
					return reviewDate < dateBasis;
			  })
			: true;
	};

	var getHistory = (res) => {
		if (res._refs) {
			return res._refs
				.filter((ref) =>
					ref._children && ref._children[0].refs
						? ref._children[0].refs.map((ref2) => ref2.title).includes("roam/sr/review")
						: false
				)
				.map((review) => {
					return {
						date: getFuckingDate(review.page.uid),
						signal: review.refs[0] ? review.refs[0].title.slice(2) : null,
						uid: review.uid,
						string: review.string,
					};
				})
				.sort((a, b) => a.date - b.date);
		} else return [];
	};

	// Query for all cards and their history
	var mainQuery = `[
    :find (pull ?card [
      :block/string 
      :block/uid 
      {:block/refs [:node/title]} 
      {:block/_refs [:block/uid :block/string {:block/_children [:block/uid {:block/refs [:node/title]}]} {:block/refs [:node/title]} {:block/page [:block/uid]}]}
      {:block/_children ...}
    ])
    :where 
      [?card :block/refs ?srPage] 
      [?srPage :node/title "${roamsr.settings.mainTag}"] 
      (not-join [?card] 
        [?card :block/refs ?flagPage] 
        [?flagPage :node/title "${roamsr.settings.flagTag}"])
      (not-join [?card] 
        [?card :block/refs ?queryPage] 
        [?queryPage :node/title "query"])
    ]`;
	var mainQueryResult = await window.roamAlphaAPI.q(mainQuery);
	var cards = mainQueryResult.map((result) => {
		let res = result[0];
		let card = {
			uid: res.uid,
			isNew: isNew(res),
			decks: getDecks(res),
			algorithm: getAlgorithm(res),
			string: res.string,
			history: getHistory(res),
		};
		return card;
	});

	// Query for today's review
	var todayUid = getRoamDate().uid;
	var todayQuery = `[
    :find (pull ?card 
      [:block/uid 
      {:block/refs [:node/title]} 
      {:block/_refs [{:block/page [:block/uid]}]}]) 
      (pull ?review [:block/refs])
    :where 
      [?reviewParent :block/children ?review] 
      [?reviewParent :block/page ?todayPage] 
      [?todayPage :block/uid "${todayUid}"] 
      [?reviewParent :block/refs ?reviewPage] 
      [?reviewPage :node/title "roam/sr/review"] 
      [?review :block/refs ?card] 
      [?card :block/refs ?srPage] 
      [?srPage :node/title "${roamsr.settings.mainTag}"]
    ]`;
	var todayQueryResult = await window.roamAlphaAPI.q(todayQuery);
	var todayReviewedCards = todayQueryResult
		.filter((result) => result[1].refs.length == 2)
		.map((result) => {
			let card = {
				uid: result[0].uid,
				isNew: isNew(result[0]),
				decks: getDecks(result[0]),
			};
			return card;
		});

	// Filter only cards that are due
	cards = cards.filter((card) =>
		card.history.length > 0
			? card.history.some((review) => {
					return !review.signal && new Date(review.date) <= dateBasis;
			  })
			: true
	);

	// Filter out cards over limit
	roamsr.state.extraCards = [[], []];
	if (roamsr.state.limits) {
		for (let deck of roamsr.settings.customDecks.concat(roamsr.settings.defaultDeck)) {
			var todayReviews = todayReviewedCards.reduce(
				(a, card) => {
					if (deck.tag ? card.decks.includes(deck.tag) : card.decks.length == 0) {
						if (!a[2].includes(card.uid)) {
							a[2].push(card.uid);
							a[card.isNew ? 0 : 1]++;
						}
					}
					return a;
				},
				[0, 0, []]
			);

			cards.reduceRight(
				(a, card, i) => {
					if (deck.tag ? card.decks.includes(deck.tag) : card.decks.length == 0) {
						var j = card.isNew ? 0 : 1;
						var limits = [deck.newCardLimit || 0, deck.reviewLimit || 0];
						if (a[j]++ >= limits[j] - todayReviews[j]) {
							roamsr.state.extraCards[j].push(cards.splice(i, 1));
						}
					}
					return a;
				},
				[0, 0]
			);
		}
	}

	// Sort (new to front)
	cards = cards.sort((a, b) => a.history.length - b.history.length);
	return cards;
};
