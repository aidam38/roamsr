window.roamsrUserSettings = {};

/* ====== MAIN SETTINGS ====== */

// If we start with new or old cards
// Type: Boolean
roamsrUserSettings.startWithNewCards = true;

// If the left sidebar should be closed when starting a session
// Type: Boolean
roamsrUserSettings.closeLeftSideBar = true;

// Main tags used to add cards.
// Type: Array of Strings
roamsrUserSettings.mainTags = ["sr"];

// Tag used to flag cards.
// Cardblocks with this tag won't get shown in review (meant for rewrite)
// Type: String
roamsrUserSettings.flagTag = "f";

// Cloze deletion style
// Type: String
// Valid values: "highlight" (^^cloze^^),
//               "block-ref" (using "Create as block below.")
roamsrUserSettings.clozeStyle = "highlight";

/* ====== DEFAULT DECK ====== */
roamsrUserSettings.defaultDeck = {};

// Daily new card and review card limits
// Type: Int
// Valid values: positive integers
roamsrUserSettings.defaultDeck.newCardLimit = 20;
roamsrUserSettings.defaultDeck.reviewLimit = 50;

// Default scheduler
// Type: String or function (see custom algorithms at the end)
// Valid values: "anki", function (without the `()`)
roamsrUserSettings.defaultDeck.scheduler = "anki";

// Default scheduler config
// For more info on Anki, see:
// https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html
roamsrUserSettings.defaultDeck.config = {
	defaultFactor: 2.5,
	firstFewIntervals: [1, 6],
	factorModifier: 0.15,
	easeBonus: 1.3,
	hardFactor: 1.2,
	minFactor: 1.3,
	jitterPercentage: 0.05,
	maxInterval: 50 * 365,
	responseTexts: ["Again.", "Hard.", "Good.", "Easy."],
};

/* ====== CUSTOM DECKS ====== */
// Don't forget to add your decks to the Array at the end of this section

/* MY DECK (example) */
var myDeck = {};
// Deck's main tag (if a card references this page, it's in this deck)
// If a card is in multiple decks, the most recent one is picked
// Generally, try to have only one deck per card
// Type: String
myDeck.tag = "mydeck";

// Deck's new card and review card limits
// Gets enforced on top of default's decks limit
// Type: positive integer
myDeck.newCardLimit = 10;
myDeck.reviewLimit = 30;

// Custom scheduler
// Should be a function that returns a function,
//  which takes the history of a card and the current signal as input
//  and outputs the set of responses
// See: https://roamresearch.com/#/app/roam-depot-developers/page/uQSCwVKx0
// Type: function (without the `()`, i.e. not the return value, but the function itself)
myDeck.scheduler = (config) => {
	// Configure your scheduler using config...

	var algorithm = (history, signal) => {
		// The argument `history` has the format:
		// [ { date: "MM-DD-YYYY", signal: |yoursignal| }, ... ] (it is ordered by date)
		// So its an Array of objects with the date and signal of each review

		// The argument `signal` holds the current signal

		let lastInterval = new Date() - new Date(history[history.length - 1].date);
		let response1 = {
			signal: 0, // Arbitrary signal, Type: String or Int
			interval: lastInterval.getDate(), // Next interval, Type: Int
			responseText: "Same as last time.", // Text on the button, Type: String
		};

		// Return value should be an array of responses
		// Each response must contain:
		//   * `signal` (completely your choice), Type: String or Int;
		//   * `interval` (when to schedule in), Type: Int
		//   * `responseText` (text to render on the button), Type: String
		return [response1 /* ... other responses */];
	};
	return algorithm;
};

// Whatever parameters you want your scheduler to have
// Type: Object
myDeck.config = {};

/* ARRAY OF CUSTOM DECKS */
// Type: Array of Objects
roamsrUserSettings.defaultDeck.customDecks = [myDeck /* ... other decks */];

console.log("🗃️ Loaded roam/sr settings.");
