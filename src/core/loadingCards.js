import { ankiScheduler } from "../schedulers/ankiScheduler";
import { dailyPageUIDToCrossBrowserDate, getRoamDate, sleep } from "./helperFunctions";
import { setLoading } from "../ui/uiElements";

const recurDeck = (part) => {
	const result = [];
	// decks are tags, so we need to evaluate the included tags
	if (part.refs) result.push(...part.refs);
	// if this query result has _children, it might be a review-block
	// so to get the real tags we need to recur until we find the original
	if (part._children && part._children.length > 0) result.push(...recurDeck(part._children[0]));
	return result;
};

const getDecks = (res, settings) => {
	const possibleDecks = recurDeck(res).map((deck) => deck.title);
	return possibleDecks.filter((deckTag) => settings.customDecks.map((customDeck) => customDeck.tag).includes(deckTag));
};

const getAlgorithm = (res, settings) => {
	const decks = getDecks(res, settings);

	let preferredDeck;
	if (decks && decks.length > 0) {
		preferredDeck = settings.customDecks.filter((customDeck) => customDeck.tag == decks[decks.length - 1])[0];
	} else preferredDeck = settings.defaultDeck;

	const scheduler = preferredDeck.scheduler || preferredDeck.algorithm;
	const config = preferredDeck.config;

	let algorithm;
	if (!scheduler || scheduler === "anki") {
		algorithm = ankiScheduler(config);
	} else algorithm = scheduler(config);

	return algorithm;
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
		date: dailyPageUIDToCrossBrowserDate(block.page.uid),
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
		? // if one history unit contains no signal and fits the date, the card is due
		card.history.some((review) => {
			return !review.signal && new Date(review.date) <= dateBasis;
		})
		: true;

const srPageTagsToClause = (tags) => "(or " + tags.map((tag) => `[?srPage :node/title "${tag}"]`).join("\n") + ")";

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
			  ${srPageTagsToClause(settings.mainTags)}
			  [?card :block/refs ?srPage] 
			  (not-join [?card] 
				[?flagPage :node/title "${settings.flagTag}"]
				[?card :block/refs ?flagPage])
			  (not-join [?card] 
				[?queryPage :node/title "query"]
				[?card :block/refs ?queryPage])
			]`;

export const isNew = (res) => {
	return res._refs ? res._refs.filter(isReviewBlock).length === 0 : true;
};

const queryDueCards = async (settings, dateBasis, asyncQueryFunction) => {
	const allPermissibleCardsQuery = createQueryForAllPermissibleCards(settings);
	const allPermissibleCardsQueryResults = await asyncQueryFunction(allPermissibleCardsQuery);
	return allPermissibleCardsQueryResults
		.map((result) => {
			let res = result[0];
			let card = {
				uid: res.uid,
				isNew: isNew(res),
				decks: getDecks(res, settings),
				algorithm: getAlgorithm(res, settings),
				string: res.string,
				history: extractHistoryFromQueryResult(res),
			};
			return card;
		})
		.filter((card) => isDue(card, dateBasis))
		.filter((card) => card.uid);
};

const getTodayQuery = (settings, todayUid) => `[
    :find (pull ?card 
      [:block/uid 
      {:block/refs [:node/title]} 
      {:block/_refs 
		[
			{:block/page [:block/uid]}
			{:block/_children 
				[:block/uid {:block/refs [:node/title]}]}
		]}]) 
      (pull ?review [:block/refs])
    :where 
	  ${srPageTagsToClause(settings.mainTags)}
      [?card :block/refs ?srPage] 
      [?review :block/refs ?card] 
      [?reviewPage :node/title "roam/sr/review"] 
      [?reviewParent :block/refs ?reviewPage] 
      [?reviewParent :block/children ?review] 
      [?todayPage :block/uid "${todayUid}"] 
      [?reviewParent :block/page ?todayPage] 
    ]`;

const queryTodayReviewedCards = async (settings, asyncQueryFunction) => {
	// Query for today's review
	const todayUid = getRoamDate().uid;
	const todayQuery = getTodayQuery(settings, todayUid);
	const todayQueryResult = await asyncQueryFunction(todayQuery);
	return todayQueryResult
		.filter((result) => result[1].refs.length == 2)
		.map((result) => {
			const res = result[0];
			const card = {
				uid: res.uid,
				isNew: isNew(res),
				decks: getDecks(res, settings),
			};
			return card;
		});
};

export const isLastRelevantDeck = (currentDeckTag, iterationDeckTags, cardDecksTags) => {
	// assumes the current deck tag is included in cardDecksTags
	const curTagIndex = iterationDeckTags.indexOf(currentDeckTag);
	const indicesInIteration = cardDecksTags.map((tag) => iterationDeckTags.indexOf(tag));
	return indicesInIteration.filter((index) => index > curTagIndex).length === 0;
};

export const filterCardsOverLimit = (settings, cards, todayReviewedCards) => {
	const extraCards = [[], []];
	const filteredCards = [...cards];

	const resCardsUIDs = [];
	const resCards = [];

	const decks = settings.customDecks.concat(settings.defaultDeck);
	// to simplify the algorithm, we assume that the provided cards work with the provided limits
	// in the case of multi-deck cards this might not always be the case
	// example:
	// if we have X cards that belong to deck1 with limit X AND deck2 with limit X-1,
	// then the limit of deck2 will not be adhered to, the higher limit "wins"
	// if we have multi-deck cards AND single-deck cards,
	// then both limits might be adhered to depending on the ordering of the cards

	const deckTags = decks.map((deck) => deck.tag);

	for (let deck of decks) {
		const reviewUIDs = [];
		const todayReviews = [0, 0];
		for (let i = 0; i < todayReviewedCards.length; i++) {
			const card = todayReviewedCards[i];
			if (deck.tag ? card.decks.includes(deck.tag) : card.decks.length == 0) {
				// need to check, because a card can be reviewed multiple times per day
				if (!reviewUIDs.includes(card.uid)) {
					reviewUIDs.push(card.uid);
					todayReviews[card.isNew ? 0 : 1]++;
				}
			}
		}

		// because we support multi-deck cards, we need to make sure we include already picked cards in the limit
		let alreadyPickedNew = 0;
		let alreadyPickedOld = 0;
		if (deck.tag) {
			const alreadyPicked = resCards.filter((card) => card.decks.includes(deck.tag));
			alreadyPickedNew = alreadyPicked.filter((card) => card.isNew).length;
			alreadyPickedOld = alreadyPicked.filter((card) => !card.isNew).length;
		}

		const limits = [
			deck.newCardLimit !== undefined ? Math.max(0, deck.newCardLimit - todayReviews[0] - alreadyPickedNew) : Infinity,
			deck.reviewLimit !== undefined ? Math.max(0, deck.reviewLimit - todayReviews[1] - alreadyPickedOld) : Infinity,
		];

		for (let i = filteredCards.length - 1; i >= 0; i--) {
			const card = filteredCards[i];

			if (deck.tag ? card.decks.includes(deck.tag) : card.decks.length == 0) {
				const j = card.isNew ? 0 : 1;

				// with multi-deck cards its possible that the card was already added
				// because we include this case in the limits, we dont need to do anything
				if (!resCardsUIDs.includes(card.uid)) {
					if (limits[j] === Infinity || limits[j] > 0) {
						resCards.push(card);
						// for performance we maintain a second UID arr
						resCardsUIDs.push(card.uid);

						if (limits[j] !== Infinity) {
							limits[j]--;
						}
					} else {
						// card is only in default deck
						if (!deck.tag) {
							extraCards[j].push(card);
						}
						// if multiple decks then only the last deck should put it into the extraCards
						// because otherwise a different deck might be able to still use it!
						else if (card.decks.length > 1) {
							if (isLastRelevantDeck(deck.tag, deckTags, card.decks)) {
								extraCards[j].push(card);
							}
						} else {
							// single deck case
							extraCards[j].push(card);
						}
					}
				}
			}
		}
	}
	return { extraCards, filteredCards: resCards };
};

export const loadCards = async (hasLimits, settings, asyncQueryFunction, dateBasis = new Date()) => {
	setLoading(true);
	await sleep(50)
	let cards = await queryDueCards(settings, dateBasis, asyncQueryFunction);
	const todayReviewedCards = await queryTodayReviewedCards(settings, asyncQueryFunction);
	setLoading(false);

	let extraCardsResult;
	if (hasLimits) {
		const { extraCards, filteredCards } = filterCardsOverLimit(settings, cards, todayReviewedCards);
		extraCardsResult = extraCards;
		cards = filteredCards;
	} else {
		extraCardsResult = [[], []];
	}

	if (settings.startWithNewCards) {
		cards.sort((a, b) => a.history.length - b.history.length);
		extraCardsResult[0].sort((a, b) => a.history.length - b.history.length);
		extraCardsResult[1].sort((a, b) => a.history.length - b.history.length);
	} else {
		cards.sort((a, b) => b.history.length - a.history.length);
		extraCardsResult[0].sort((a, b) => b.history.length - a.history.length);
		extraCardsResult[1].sort((a, b) => b.history.length - a.history.length);
	}

	return { extraCards: extraCardsResult, cards };
};
