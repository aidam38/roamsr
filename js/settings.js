window.roamsrUserSettings = {};

// Example custom algorithm
var weeklyScheduler = (config) => {
  var algorithm = (history, signal) => {
    return [{
      signal: 0,
      interval: 7,
      responseText: "Next week.",
    }]
  }
  return algorithm;
}

roamsrUserSettings = {
  mainTag: "sr",
  flagTag: "f",
  clozeStyle: "highlight" // "highlight" or "blockref"
  defaultDeck: {
    algorithm: "anki", // Default algorithm
    config: {
      defaultFactor: 2.5,
      firstFewIntervals: [1, 6],
      factorModifier: 0.15,
      easeBonus: 1.3,
      hardFactor: 1.2,
      minFactor: 1.3,
      jitterPercentage: 0.05,
      maxInterval: 50 * 365,
      responseTexts: ["Again.", "Hard.", "Good.", "Easy."]
    },
    newCardLimit: 20,
    reviewLimit: 50
  },
  customDecks: [
    {
      tag: "weekly",
      algorithm: weeklyScheduler,
      config: {},
      newCardLimit: 20,
      reviewLimit: 50,
    }],
};