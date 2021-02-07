window.roamsrUserSettings = {};

var fixedScheduler = (config) => {
  var algorithm = (history, signal) => {
    return [{
      signal: 0,
      interval: 7,
      responseText: "Next week.",
    },
    {
      signal: 1,
      interval: 31,
      responseText: "Next month."
    }]
  }
  return algorithm;
}

roamsrUserSettings = {
  mainTag: "sr",
  flagTag: "f",
  defaultDeck: {
    algorithm: null,
    config: {
      responses: [
        "AAA.",
          "Wtf ok.",
          "Yay.",
          "EZ."]
    },
    newCardLimit: 20,
    reviewLimit: 50
  },
  customDecks: [
    {
      tag: "deck/fixed",
      algorithm: fixedScheduler,
      config: {},
      newCardLimit: 20,
      reviewLimit: 200,
    }]
};