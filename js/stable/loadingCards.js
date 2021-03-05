import { ankiScheduler } from "./ankiScheduler";
import { getCrossBrowserDate, getRoamDate } from "./helperFunctions";

const recurDeck = (part) => {
	var result = [];
	if (part.refs) result.push(...part.refs);
	if (part._children && part._children.length > 0) result.push(...recurDeck(part._children[0]));
	return result;
};

const getDecks = (res, settings) => {
	var possibleDecks = recurDeck(res).map((deck) => deck.title);
	return possibleDecks.filter((deckTag) => settings.customDecks.map((customDeck) => customDeck.tag).includes(deckTag));
};

const getAlgorithm = (res, settings) => {
	let decks = getDecks(res, settings);

	let preferredDeck;
	if (decks && decks.length > 0) {
		preferredDeck = settings.customDecks.filter((customDeck) => customDeck.tag == decks[decks.length - 1])[0];
	} else preferredDeck = settings.defaultDeck;

	let scheduler = preferredDeck.scheduler || preferredDeck.algorithm;
	let config = preferredDeck.config;

	let algorithm;
	if (!scheduler || scheduler === "anki") {
		algorithm = ankiScheduler(config);
	} else algorithm = scheduler(config);

	return algorithm;
};

const isNew = (res, dateBasis) => {
	return res._refs
		? !res._refs.some((review) => {
				var reviewDate = new Date(getCrossBrowserDate(review.page.uid));
				reviewDate.setDate(reviewDate.getDate() + 1);
				return reviewDate < dateBasis;
		  })
		: true;
};

const isReviewBlock = (block) =>
	// is a child-block
	block._children &&
	// first parent has refs
	block._children[0].refs
		? // refs of parent include "roam/sr/review" = parent is a review-parent-block
		  block._children[0].refs.map((ref2) => ref2.title).includes("roam/sr/review")
		: false;

// first ref is always a r/x-page where x is the repetition count / signal value
// r/x -> x is done via the slice
const extractSignalFromReviewBlock = (block) => (block.refs[0] ? block.refs[0].title.slice(2) : null);

const reviewBlockToHistoryUnit = (block) => {
	return {
		date: getCrossBrowserDate(block.page.uid),
		signal: extractSignalFromReviewBlock(block),
		uid: block.uid,
		string: block.string,
	};
};

const extractHistoryFromQueryResult = (result) => {
	// having history means that the card-block is ref'ed by at least one review block
	// that can be found nested under the "roam/sr/review"-block / review-parent-block on the respective daily-page
	if (result._refs) {
		return result._refs
			.filter(isReviewBlock)
			.map(reviewBlockToHistoryUnit)
			.sort((a, b) => a.date - b.date);
	} else return [];
};

const isDue = (card, dateBasis) =>
	card.history.length > 0
		? card.history.some((review) => {
				return !review.signal && new Date(review.date) <= dateBasis;
		  })
		: true;

//cards with the flag-tag or the "query"-tag are not permissible
const createQueryForAllPermissibleCards = (settings) => `[
			:find (pull ?card [
			  :block/string 
			  :block/uid 
			  {:block/refs [:node/title]} 
			  {:block/_refs 
				[:block/uid :block/string 
					{:block/_children 
						[:block/uid {:block/refs [:node/title]}]} 
					{:block/refs [:node/title]} 
					{:block/page [:block/uid]}]}
			  {:block/_children ...}
			])
			:where 
			  [?srPage :node/title "${settings.mainTag}"] 
			  [?card :block/refs ?srPage] 
			  (not-join [?card] 
				[?flagPage :node/title "${settings.flagTag}"]
				[?card :block/refs ?flagPage])
			  (not-join [?card] 
				[?queryPage :node/title "query"]
				[?card :block/refs ?queryPage])
			]`;

const queryDueCards = async (settings, dateBasis, asyncQueryFunction) => {
	const allPermissibleCardsQuery = createQueryForAllPermissibleCards(settings);
	const allPermissibleCardsQueryResults = await asyncQueryFunction(allPermissibleCardsQuery);
	return allPermissibleCardsQueryResults
		.map((result) => {
			let res = result[0];
			let card = {
				uid: res.uid,
				isNew: isNew(res, dateBasis),
				decks: getDecks(res, settings),
				algorithm: getAlgorithm(res, settings),
				string: res.string,
				history: extractHistoryFromQueryResult(res),
			};
			return card;
		})
		.filter((card) => isDue(card, dateBasis));
};

const getTodayQuery = (settings, todayUid) => `[
    :find (pull ?card 
      [:block/uid 
      {:block/refs [:node/title]} 
      {:block/_refs [{:block/page [:block/uid]}]}]) 
      (pull ?review [:block/refs])
    :where 
	  [?srPage :node/title "${settings.mainTag}"]
	  [?card :block/refs ?srPage] 
      [?review :block/refs ?card] 
      [?reviewPage :node/title "roam/sr/review"] 
      [?reviewParent :block/refs ?reviewPage] 
      [?reviewParent :block/children ?review] 
      [?todayPage :block/uid "${todayUid}"] 
      [?reviewParent :block/page ?todayPage] 
    ]`;

const queryTodayReviewedCards = async (settings, dateBasis, asyncQueryFunction) => {
	// Query for today's review
	const todayUid = getRoamDate().uid;
	const todayQuery = getTodayQuery(settings, todayUid);
	const todayQueryResult = await asyncQueryFunction(todayQuery);
	return todayQueryResult
		.filter((result) => result[1].refs.length == 2)
		.map((result) => {
			let card = {
				uid: result[0].uid,
				isNew: isNew(result[0], dateBasis),
				decks: getDecks(result[0], settings),
			};
			return card;
		});
};

const filterCardsOverLimit = (settings, cards, todayReviewedCards) => {
	const extraCards = [[], []];
	const filteredCards = [...cards];
	for (let deck of settings.customDecks.concat(settings.defaultDeck)) {
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

		const limits = [deck.newCardLimit || 0, deck.reviewLimit || 0];
		const a = [0, 0];

		for (let i = filteredCards.length - 1; i >= 0; i--) {
			const card = filteredCards[i];
			if (deck.tag ? card.decks.includes(deck.tag) : card.decks.length == 0) {
				var j = card.isNew ? 0 : 1;
				if (a[j] >= limits[j] - todayReviews[j]) {
					a[j]++;
					extraCards[j].push(filteredCards.splice(i, 1));
				}
			}
		}
		extraCards[0] = extraCards[0].concat(extraCards[0]);
		extraCards[1] = extraCards[1].concat(extraCards[1]);
	}
	return { extraCards, filteredCards };
};

export const loadCards = async (hasLimits, settings, asyncQueryFunction, dateBasis = new Date()) => {
	var cards = await queryDueCards(settings, dateBasis, asyncQueryFunction);
	var todayReviewedCards = await queryTodayReviewedCards(settings, dateBasis, asyncQueryFunction);

	let extraCardsResult;
	if (hasLimits) {
		const { extraCards, filteredCards } = filterCardsOverLimit(settings, cards, todayReviewedCards);
		extraCardsResult = extraCards;
		cards = filteredCards;
	} else {
		extraCardsResult = [[], []];
	}

	// TODO: extraCards are not sorted?
	// Sort (new to front)
	cards = cards.sort((a, b) => a.history.length - b.history.length);
	return { extraCards: extraCardsResult, cards };
};
