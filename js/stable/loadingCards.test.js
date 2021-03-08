import { filterCardsOverLimit, isLastRelevantDeck, isNew } from "./loadingCards";

test("isNew", () => {
	// card can be ref'ed everywhere and still be new
	let res = { _refs: [{ page: { uid: "01-28-2020" } }, { page: { uid: "test" } }] };
	expect(isNew(res)).toBe(true);

	// card is only not new if it is ref'ed under a review-parent
	res = { _refs: [{ page: { uid: "01-28-2020" }, _children: [{ refs: [{ title: "roam/sr/review" }] }] }] };
	expect(isNew(res)).toBe(false);
});

test("isLastRelevantDeck", () => {
	let iterationDeckTags = ["deck1", "deck0", "deck-1", "deck2", "default"];
	let cardDecksTags = ["deck2", "deck-1", "deck1"];

	expect(isLastRelevantDeck("deck2", iterationDeckTags, cardDecksTags)).toBe(true);
	expect(isLastRelevantDeck("deck1", iterationDeckTags, cardDecksTags)).toBe(false);
	expect(isLastRelevantDeck("deck-1", iterationDeckTags, cardDecksTags)).toBe(false);

	iterationDeckTags = ["deck1", "deck0", "deck-1", "default", "deck2"];
	cardDecksTags = ["deck2", "deck-1", "deck1"];

	expect(isLastRelevantDeck("deck2", iterationDeckTags, cardDecksTags)).toBe(true);
	expect(isLastRelevantDeck("deck1", iterationDeckTags, cardDecksTags)).toBe(false);
	expect(isLastRelevantDeck("deck-1", iterationDeckTags, cardDecksTags)).toBe(false);

	iterationDeckTags = ["deck2", "deck1", "deck0", "deck-1", "default"];
	cardDecksTags = ["deck2"];

	expect(isLastRelevantDeck("deck2", iterationDeckTags, cardDecksTags)).toBe(true);
});

test("filterCardsOverLimit: defaultDeck", () => {
	const settings = {
		defaultDeck: { algorithm: null, config: {}, newCardLimit: 1, reviewLimit: 1 },
		customDecks: [],
	};
	const cards = [
		{
			uid: "uid1",
			isNew: true,
			decks: [],
		},
		{
			uid: "uid2",
			isNew: true,
			decks: [],
		},
		{
			uid: "uid3",
			isNew: false,
			decks: [],
		},
	];
	const todayReviewedCards = [{ uid: "NoggQc_vG", isNew: false, decks: [] }];

	const res = filterCardsOverLimit(settings, cards, todayReviewedCards);

	expect(res.extraCards.length).toBe(2);

	expect(res.extraCards[0].length).toBe(1);
	expect(res.extraCards[0][0]).toEqual([cards[0]]);

	expect(res.extraCards[1].length).toBe(1);
	expect(res.extraCards[1][0]).toEqual([cards[2]]);

	expect(res.filteredCards).toEqual([cards[1]]);
});

test("filterCardsOverLimit: multiple decks", () => {
	const generateCard = (newness, nr, deck) => {
		return {
			uid: "uid" + nr,
			isNew: newness,
			decks: deck ? (Array.isArray(deck) ? deck : [deck]) : [],
		};
	};
	const generateTrueCard = (nr, deck) => generateCard(true, nr, deck);
	const generateFalseCard = (nr, deck) => generateCard(false, nr, deck);

	const filterForDeck = (arr, deck) => arr.filter((v) => v.decks.includes(deck));
	const filterForDefault = (arr) => arr.filter((v) => v.decks.length === 0);
	const filterForNew = (arr) => arr.filter((v) => v.isNew);
	const filterForOld = (arr) => arr.filter((v) => !v.isNew);

	const settings = {
		defaultDeck: { algorithm: null, config: {}, newCardLimit: 4, reviewLimit: 5 },
		customDecks: [
			{ tag: "deck1", newCardLimit: 7, reviewLimit: 5 },
			{ tag: "deck2", newCardLimit: 8, reviewLimit: 11 },
			{ tag: "deck3", newCardLimit: 20, reviewLimit: 50 },
		],
	};

	// default: 5 new cards
	// default: 7 review cards
	const defaultCards = [1, 2, 3, 4, 5]
		.map((nr) => generateTrueCard(nr))
		.concat([6, 7, 8, 9, 10, 11, 12].map((nr) => generateFalseCard(nr)));

	const multiDeckCards = [34, 35, 36, 37, 38]
		.map((nr) => generateTrueCard(nr, ["deck2", "deck1"]))
		.concat([39, 40, 41, 42, 43].map((nr) => generateFalseCard(nr, ["deck2", "deck1"])));

	// deck1: 5 (multi) + 4 = 9 new cards
	// deck1: 5 (multi) + 5 = 10 review cards
	const deck1Cards = [13, 14, 15, 16]
		.map((nr) => generateTrueCard(nr, "deck1"))
		.concat([17, 18, 19, 20, 21].map((nr) => generateFalseCard(nr, "deck1")));

	// deck2: 5 (multi) + 5 = 10 new cards
	// deck2: 5 (multi) + 7 = 12 review cards
	const deck2Cards = [22, 23, 24, 25, 26]
		.map((nr) => generateTrueCard(nr, "deck2"))
		.concat([27, 28, 29, 30, 31, 32, 33].map((nr) => generateFalseCard(nr, "deck2")));

	const deck3Cards = [44, 45, 46]
		.map((nr) => generateTrueCard(nr, "deck3"))
		.concat([47, 48, 49].map((nr) => generateFalseCard(nr, "deck3")));

	// minus duplicates:
	// default: 2 new cards
	// default: 1 review card
	// deck1: 1 new card + 1 (multi) = 2 new cards
	// deck2: 1 review card, 1 new card (multi)
	const todayReviewedCards = [
		{ uid: "review0", isNew: false, decks: [] },
		{ uid: "review1", isNew: true, decks: [] },
		{ uid: "review0", isNew: false, decks: [] },
		{ uid: "review2", isNew: true, decks: [] },
		{ uid: "review0", isNew: false, decks: [] },
		{ uid: "review3", isNew: true, decks: ["deck1"] },
		{ uid: "review4", isNew: false, decks: ["deck2"] },
		{ uid: "review4", isNew: false, decks: ["deck2"] },
		{ uid: "review3", isNew: true, decks: ["deck1"] },
		{ uid: "review5", isNew: true, decks: ["deck1", "deck2"] },
		{ uid: "review6", isNew: false, decks: ["deck1", "deck2"] },
	];

	const execute = (cards) => {
		const res = filterCardsOverLimit(settings, cards, todayReviewedCards);

		// check that there are no duplicates
		expect(new Set(res.filteredCards.map((card) => card.uid)).size).toBe(res.filteredCards.length);
		expect(new Set(res.extraCards[0].map((arr) => arr[0].uid)).size).toBe(res.extraCards[0].length);
		expect(new Set(res.extraCards[1].map((arr) => arr[0].uid)).size).toBe(res.extraCards[1].length);

		expect(res.extraCards.length).toBe(2);

		// check if cards are sorted in the correct extraCards position
		expect(filterForNew(res.extraCards[0].map((arr) => arr[0])).length).toBe(res.extraCards[0].length);
		expect(filterForOld(res.extraCards[1].map((arr) => arr[0])).length).toBe(res.extraCards[1].length);

		const defaultResFiltered = filterForDefault(res.filteredCards);
		const defaultResFilteredNew = filterForNew(defaultResFiltered);
		const defaultResFilteredOld = filterForOld(defaultResFiltered);
		const defaultResExtra0 = filterForDefault(res.extraCards[0].map((arr) => arr[0]));
		const defaultResExtra1 = filterForDefault(res.extraCards[1].map((arr) => arr[0]));

		const deck1ResFiltered = filterForDeck(res.filteredCards, "deck1");
		const deck1ResFilteredNew = filterForNew(deck1ResFiltered);
		const deck1ResFilteredOld = filterForOld(deck1ResFiltered);
		const deck1ResExtra0 = filterForDeck(
			res.extraCards[0].map((arr) => arr[0]),
			"deck1"
		);
		const deck1ResExtra1 = filterForDeck(
			res.extraCards[1].map((arr) => arr[0]),
			"deck1"
		);

		const deck2ResFiltered = filterForDeck(res.filteredCards, "deck2");
		const deck2ResFilteredNew = filterForNew(deck2ResFiltered);
		const deck2ResFilteredOld = filterForOld(deck2ResFiltered);
		const deck2ResExtra0 = filterForDeck(
			res.extraCards[0].map((arr) => arr[0]),
			"deck2"
		);
		const deck2ResExtra1 = filterForDeck(
			res.extraCards[1].map((arr) => arr[0]),
			"deck2"
		);

		const deck3ResFiltered = filterForDeck(res.filteredCards, "deck3");
		const deck3ResFilteredNew = filterForNew(deck3ResFiltered);
		const deck3ResFilteredOld = filterForOld(deck3ResFiltered);
		const deck3ResExtra0 = filterForDeck(
			res.extraCards[0].map((arr) => arr[0]),
			"deck3"
		);
		const deck3ResExtra1 = filterForDeck(
			res.extraCards[1].map((arr) => arr[0]),
			"deck3"
		);

		// new expectations:

		// default: 4 new card limit - 2 new cardTodayReviews = 2 new card limit
		// default: 5 new cards are ready
		// default: should have 2 new in queue, 3 new in extraCards
		expect(defaultResFilteredNew.length).toBe(2);
		expect(defaultResExtra0.length).toBe(3);

		// deck1: 7 new card limit - 2 new cardTodayReviews = 5 new card limit
		// deck1: 9 new cards are ready
		// deck1: should have 5 new in queue, 4 new in extraCards
		expect(deck1ResFilteredNew.length).toBe(5);
		expect(deck1ResExtra0.length).toBe(4);

		// deck2: 8 new card limit - 2 new cardTodayReviews = 6 new card limit
		// deck2: 10 new cards are ready
		// deck2: should have 7 new in queue, 3 new in extraCards
		expect(deck2ResFilteredNew.length).toBe(7);
		expect(deck2ResExtra0.length).toBe(3);

		// deck3: limits are much higher than ready new cards, so should have 3 new in queue, 0 in extraCards
		expect(deck3ResFilteredNew.length).toBe(3);
		expect(deck3ResExtra0.length).toBe(0);

		// review expectations:

		// default: 5 review limit - 1 old cardTodayReviews = 4 review limit
		// default: 7 reviews are ready
		// default: should have 4 review in queue, 3 review in extraCards
		expect(defaultResFilteredOld.length).toBe(4);
		expect(defaultResExtra1.length).toBe(3);

		// deck1: 5 review limit - 1 old cardTodayReviews = 4 review limit
		// deck1: 10 reviews are ready
		// deck1: should have 4 review in queue, 6 review in extraCards
		expect(deck1ResFilteredOld.length).toBe(4);
		expect(deck1ResExtra1.length).toBe(6);

		// deck2: 11 review limit - 2 old cardTodayReviews = 9 review limit
		// deck2: 12 reviews are ready
		// deck2: should have 9 review in queue, 3 review in extraCards
		expect(deck2ResFilteredOld.length).toBe(9);
		expect(deck2ResExtra1.length).toBe(3);

		// deck3: should have 3 review in queue, 0 in extraCards
		expect(deck3ResFilteredOld.length).toBe(3);
		expect(deck3ResExtra1.length).toBe(0);
	};

	// the general order of single-deck cards does not matter in the length of the results
	// note: the order of the multi-deck cards matters, see the filter function comments
	const cards = [...defaultCards, ...deck1Cards, ...multiDeckCards, ...deck3Cards, ...deck2Cards];
	const cards1 = [...deck1Cards, ...multiDeckCards, ...deck3Cards, ...deck2Cards, ...defaultCards];
	const cards2 = [...deck3Cards, ...deck1Cards, ...multiDeckCards, ...deck2Cards, ...defaultCards];

	execute(cards);
	execute(cards1);
	execute(cards2);
});
