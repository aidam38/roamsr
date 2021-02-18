/* roam/sr - Spaced Repetition in Roam Research
   Author: Adam Krivka
   v1.0.0
   https://github.com/aidam38/roamsr
 */

var VERSION = "v1.0.0";

if (!window.roamsr) window.roamsr = {};

/* ====== SCHEDULERS / ALGORITHMS ====== */

roamsr.ankiScheduler = (userConfig) => {
  var config = {
    defaultFactor: 2.5,
    firstFewIntervals: [1, 6],
    factorModifier: 0.15,
    easeBonus: 1.3,
    hardFactor: 1.2,
    minFactor: 1.3,
    jitterPercentage: 0.05,
    maxInterval: 50 * 365,
    responseTexts: ["Again.", "Hard.", "Good.", "Easy."]
  }
  config = Object.assign(config, userConfig);

  var algorithm = (history) => {
    var nextInterval;
    var lastFail = history ? history.map(review => review.signal).lastIndexOf("1") : 0;
    history = history ? (lastFail == -1 ? history : history.slice(lastFail + 1)) : [];
    // Check if in learning phase
    if (history.length == 0 || history.length <= config.firstFewIntervals.length) {
      return [{
        responseText: config.responseTexts[0],
        signal: 1,
        interval: 0
      },
      {
        responseText: config.responseTexts[2],
        signal: 3,
        interval: config.firstFewIntervals[history ? Math.max(history.length - 1, 0) : 0]
      }];
    } else {
      var calculateNewParams = (prevFactor, prevInterval, delay, signal) => {
        var [newFactor, newInterval] = (() => {
          switch (signal) {
            case "1":
              return [prevFactor - 0.2, 0];
            case "2":
              return [prevFactor - config.factorModifier, prevInterval * config.hardFactor];
            case "3":
              return [prevFactor, (prevInterval + delay / 2) * prevFactor];
            case "4":
              return [prevFactor + config.factorModifier, (prevInterval + delay) * prevFactor * config.easeBonus];
            default:
              return [prevFactor, prevInterval * prevFactor];
          }
        })();
        return [newFactor, Math.min(newInterval, config.maxInterval)];
      };
      var getDelay = (hist, prevInterval) => {
        if (hist && hist.length > 1)
          return Math.max((new Date(hist[hist.length - 1].date) - new Date(hist[hist.length - 2].date)) / (1000 * 60 * 60 * 24) - prevInterval, 0);
        else return 0;
      };
      var recurAnki = (hist) => {
        if (!hist || hist.length <= config.firstFewIntervals.length) {
          return [config.defaultFactor, config.firstFewIntervals[config.firstFewIntervals.length - 1]];
        } else {
          var [prevFactor, prevInterval] = recurAnki(hist.slice(0, -1));
          return calculateNewParams(prevFactor, prevInterval, getDelay(hist, prevInterval), hist[hist.length - 1].signal);
        }
      };

      var [finalFactor, finalInterval] = recurAnki(history.slice(0, -1));

      var addJitter = (interval) => {
        var jitter = interval * config.jitterPercentage;
        return interval + (-jitter + Math.random() * jitter)
      }

      var getResponse = (signal) => {
        return {
          responseText: config.responseTexts[parseInt(signal) - 1],
          signal: signal,
          interval: Math.floor(addJitter(calculateNewParams(finalFactor, finalInterval, getDelay(history, finalInterval), signal)[1]))
        }
      }
      return [getResponse("1"), getResponse("2"), getResponse("3"), getResponse("4")]
    }
  }
  return algorithm;
};

/* ====== HELPER FUNCTIONS ====== */

roamsr.sleep = m => {
  var t = m ? m : 10;
  return new Promise(r => setTimeout(r, t))
};

roamsr.createUid = () => {
  // From roam42 based on https://github.com/ai/nanoid#js version 3.1.2
  let nanoid = (t = 21) => { let e = "", r = crypto.getRandomValues(new Uint8Array(t)); for (; t--;) { let n = 63 & r[t]; e += n < 36 ? n.toString(36) : n < 62 ? (n - 26).toString(36).toUpperCase() : n < 63 ? "_" : "-" } return e };
  return nanoid(9);
};

roamsr.removeSelector = (selector) => {
  document.querySelectorAll(selector).forEach(element => { element.remove() });
};

roamsr.goToUid = (uid) => {
  var baseUrl = "/" + new URL(window.location.href).hash.split("/").slice(0, 3).join("/");
  var url = uid ? baseUrl + "/page/" + uid : baseUrl;
  location.assign(url);
};

roamsr.getRoamDate = (date) => {
  if (!date || date == 0) date = new Date();

  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var suffix = ((d) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  })(date.getDate());

  var pad = (n) => n.toString().padStart(2, "0");

  var roamDate = {
    title: months[date.getMonth()] + " " + date.getDate() + suffix + ", " + date.getFullYear(),
    uid: pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "-" + date.getFullYear()
  };

  return roamDate
};

roamsr.getIntervalHumanReadable = (n) => {
  if (n == 0) return "<10 min"
  else if (n > 0 && n <= 15) return n + " d"
  else if (n <= 30) return (n / 7).toFixed(1) + " w"
  else if (n <= 365) return (n / 30).toFixed(1) + " m"
};

/* ====== LOADING CARDS ====== */

roamsr.loadCards = async (limits, dateBasis = new Date()) => {
  // Common functions
  var getDecks = (res) => {
    let recurDeck = (part) => {
      var result = [];
      if (part.refs) result.push(...part.refs)
      if (part._children && part._children.length > 0) result.push(...recurDeck(part._children[0]))
      return result;
    }
    var possibleDecks = recurDeck(res).map(deck => deck.title);
    return possibleDecks.filter(deckTag => roamsr.settings.customDecks.map(customDeck => customDeck.tag).includes(deckTag));
  };

  var getAlgorithm = (res) => {
    let decks = getDecks(res);
    let preferredDeck;
    let algorithm;

    if (decks && decks.length > 0) {
      preferredDeck = roamsr.settings.customDecks.filter(customDeck => customDeck.tag == decks[decks.length - 1])[0];
    } else preferredDeck = roamsr.settings.defaultDeck;

    let scheduler = preferredDeck.scheduler || preferredDeck.algorithm;
    let config = preferredDeck.config;
    if (!scheduler || scheduler === "anki") {
      algorithm = roamsr.ankiScheduler(config);
    } else algorithm = scheduler(config);

    return algorithm;
  };

  var isNew = (res) => {
    return res._refs ? !res._refs.some(review => {
      var reviewDate = new Date(review.page ? review.page.uid : null);
      reviewDate.setDate(reviewDate.getDate() + 1);
      return reviewDate < dateBasis;
    }) : true
  };

  var getHistory = (res) => {
    if (res._refs) {
      return res._refs
        .filter(ref => (ref._children && ref._children[0].refs) ? ref._children[0].refs.map(ref2 => ref2.title).includes("roam/sr/review") : false)
        .map(review => {
          return {
            date: review.page ? review.page.uid : null,
            signal: review.refs[0] ? review.refs[0].title.slice(2) : null,
            uid: review.uid,
            string: review.string
          }
        })
        .sort((a, b) => new Date(a.date) - (new Date(b.date)))
    } else return []
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
    ]`
  var mainQueryResult = await window.roamAlphaAPI.q(mainQuery);
  var cards = mainQueryResult.map(result => {
    let res = result[0];
    let card = {
      uid: res.uid,
      isNew: isNew(res),
      decks: getDecks(res),
      algorithm: getAlgorithm(res),
      string: res.string,
      history: getHistory(res),
    }
    return card;
  });

  // Query for today's review
  var todayUid = roamsr.getRoamDate().uid;
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
    ]`
  var todayQueryResult = await window.roamAlphaAPI.q(todayQuery);
  var todayReviewedCards = todayQueryResult
    .filter(result => result[1].refs.length == 2)
    .map(result => {
      let card = {
        uid: result[0].uid,
        isNew: isNew(result[0]),
        decks: getDecks(result[0])
      };
      return card;
    })

  // Filter only cards that are due
  cards = cards.filter(card => card.history.length > 0 ? card.history.some(review => { return (!review.signal && new Date(review.date) <= dateBasis) }) : true);

  // Filter out cards over limit
  roamsr.state.extraCards = [[], []];
  if (roamsr.state.limits) {
    for (deck of roamsr.settings.customDecks.concat(roamsr.settings.defaultDeck)) {

      var todayReviews = todayReviewedCards.reduce((a, card) => {
        if (deck.tag ? card.decks.includes(deck.tag) : card.decks.length == 0) {
          if (!a[2].includes(card.uid)) {
            a[2].push(card.uid);
            a[card.isNew ? 0 : 1]++;
          }
        }
        return a;
      }, [0, 0, []]);

      cards.reduceRight((a, card, i) => {
        if (deck.tag ? card.decks.includes(deck.tag) : card.decks.length == 0) {
          var j = card.isNew ? 0 : 1;
          var limits = [deck.newCardLimit || 0, deck.reviewLimit || 0];
          if (a[j]++ >= limits[j] - todayReviews[j]) {
            roamsr.state.extraCards[j].push(cards.splice(i, 1));
          }
        }
        return a;
      }, [0, 0])
    }
  };

  // Sort (new to front)
  cards = cards.sort((a, b) => a.history.length - b.history.length);
  return cards;
};

/* ====== STYLES ====== */

roamsr.addBasicStyles = () => {
  var style = `
  .roamsr-widget__review-button {
    color: #5C7080 !important;
  }
  
  .roamsr-widget__review-button:hover {
    color: #F5F8FA !important;
  }
  
  .roamsr-return-button-container {
    z-index: 100000;
    margin: 5px 0px 5px 45px;
  }

  .roamsr-wrapper {
    position: relative;
    bottom: 180px;
    justify-content: center;
  }

  .roamsr-container {
    width: 100%;
    max-width: 600px;
    justify-content: center;
    align-items: center;
    padding: 5px 20px;
  }

  .roamsr-button {
    z-index: 10000;
  }

  .roamsr-response-area {
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 15px;
  }

  .roamsr-flag-button-container {
    width: 100%;
  }
  `
  var basicStyles = Object.assign(document.createElement("style"), {
    id: "roamsr-css-basic",
    innerHTML: style
  });
  document.getElementsByTagName("head")[0].appendChild(basicStyles);
};

roamsr.setCustomStyle = (yes) => {
  var styleId = "roamsr-css-custom"
  var element = document.getElementById(styleId);
  if (element) element.remove();

  if (yes) {
    // Query new style
    var styleQuery = window.roamAlphaAPI.q(
      `[:find (pull ?style [:block/string]) :where [?roamsr :node/title "roam\/sr"] [?roamsr :block/children ?css] [?css :block/refs ?roamcss] [?roamcss :node/title "roam\/css"] [?css :block/children ?style]]`
    );

    if (styleQuery && styleQuery.length != 0) {
      var customStyle = styleQuery[0][0].string.replace("```css", "").replace("```", "");

      var roamsrCSS = Object.assign(document.createElement("style"), {
        id: styleId,
        innerHTML: customStyle
      });

      document.getElementsByTagName("head")[0].appendChild(roamsrCSS);
    }
  }
};

roamsr.showAnswerAndCloze = (yes) => {
  var styleId = "roamsr-css-mainview"
  var element = document.getElementById(styleId);
  if (element) element.remove();

  if (yes) {
    var clozeStyle = roamsr.settings.clozeStyle || "highlight";
    var style = `
    .roam-article .rm-reference-main,
    .roam-article .rm-block-children
    {
      visibility: hidden;  
    }

    .roam-article .rm-${clozeStyle} {
      background-color: #cccccc;
      color: #cccccc;
    }`

    var basicStyles = Object.assign(document.createElement("style"), {
      id: styleId,
      innerHTML: style
    });
    document.getElementsByTagName("head")[0].appendChild(basicStyles);
  }
};

/* ====== MAIN FUNCTIONS ====== */

roamsr.scheduleCardIn = async (card, interval) => {
  var nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  var nextRoamDate = roamsr.getRoamDate(nextDate);

  // Create daily note if it doesn't exist yet
  await window.roamAlphaAPI.createPage({
    page: {
      title: nextRoamDate.title
    }
  });

  await roamsr.sleep();

  // Query for the [[roam/sr/review]] block
  var queryReviewBlock = window.roamAlphaAPI.q('[:find (pull ?reviewBlock [:block/uid]) :in $ ?dailyNoteUID :where [?reviewBlock :block/refs ?reviewPage] [?reviewPage :node/title "roam/sr/review"] [?dailyNote :block/children ?reviewBlock] [?dailyNote :block/uid ?dailyNoteUID]]', nextRoamDate.uid);

  // Check if it's there; if not, create it
  var topLevelUid;
  if (queryReviewBlock.length == 0) {
    topLevelUid = roamsr.createUid();
    await window.roamAlphaAPI.createBlock({
      location: {
        "parent-uid": nextRoamDate.uid,
        order: 0
      },
      block: {
        string: "[[roam/sr/review]]",
        uid: topLevelUid
      }
    });
    await roamsr.sleep();
  } else {
    topLevelUid = queryReviewBlock[0][0].uid;
  }

  // Generate the block
  var block = {
    uid: roamsr.createUid(),
    string: "((" + card.uid + "))"
  }
  // Finally, schedule the card
  await window.roamAlphaAPI.createBlock({
    location: {
      "parent-uid": topLevelUid,
      order: 0
    },
    block: block
  });
  await roamsr.sleep();

  return {
    date: nextRoamDate.uid,
    signal: null,
    uid: block.uid,
    string: block.string
  };
};

roamsr.responseHandler = async (card, interval, signal) => {
  console.log("Signal: " + signal + ", Interval: " + interval);
  var hist = card.history;

  // If new card, make it look like it was scheduled for today
  if (hist.length == 0 || (hist[hist.length - 1] && new Date(hist[hist.length - 1].date) !== new Date())) {
    var last = hist.pop();
    if (last) {
      await window.roamAlphaAPI.deleteBlock({
        block: {
          uid: last.uid
        }
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
      string: last.string
    }
  })
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

roamsr.flagCard = () => {
  var card = roamsr.getCurrentCard();
  window.roamAlphaAPI.updateBlock({
    block: {
      uid: card.uid,
      string: card.string + " #" + roamsr.settings.flagTag
    }
  });
  var j = roamsr.getCurrentCard().isNew ? 0 : 1;
  roamsr.state.queue.push(roamsr.state.extraCards[j].shift());
};

roamsr.stepToNext = async () => {
  if (roamsr.state.currentIndex + 1 >= roamsr.state.queue.length) {
    roamsr.endSession();
  } else {
    roamsr.state.currentIndex++;
    roamsr.goToCurrentCard();
  }
  roamsr.updateCounters();
};

roamsr.goToCurrentCard = async () => {
  window.onhashchange = () => { };
  roamsr.showAnswerAndCloze(true);
  roamsr.removeReturnButton();
  var doStuff = async () => {
    roamsr.goToUid(roamsr.getCurrentCard().uid);
    await roamsr.sleep(50);
    roamsr.addContainer();
    roamsr.addShowAnswerButton();
  }

  await doStuff();
  window.onhashchange = doStuff;

  await roamsr.sleep(500);

  await doStuff();

  window.onhashchange = () => {
    roamsr.removeContainer();
    roamsr.addReturnButton();
    roamsr.showAnswerAndCloze(false);
    window.onhashchange = () => { };
  }
};

/* ====== SESSIONS ====== */

roamsr.loadSettings = () => {
  // Default settings
  roamsr.settings = {
    mainTag: "sr",
    flagTag: "f",
    clozeStyle: "highlight", // "highlight" or "block-ref"
    defaultDeck: {
      algorithm: null,
      config: {},
      newCardLimit: 20,
      reviewLimit: 100,
    },
    customDecks: []
  };
  roamsr.settings = Object.assign(roamsr.settings, window.roamsrUserSettings);
};

roamsr.loadState = async (i) => {
  roamsr.state = {
    limits: true,
    currentIndex: i,
  }
  roamsr.state.queue = await roamsr.loadCards();
  return;
};

roamsr.getCurrentCard = () => {
  var card = roamsr.state.queue[roamsr.state.currentIndex];
  return card ? card : {};
};

roamsr.startSession = async () => {
  if (roamsr.state && roamsr.state.queue.length > 0) {
    console.log("Starting session.");

    roamsr.setCustomStyle(true);

    // Hide left sidebar
    try {
      document.getElementsByClassName("bp3-icon-menu-closed")[0].click();
    } catch (e) { }

    roamsr.loadSettings();
    await roamsr.loadState(0);

    console.log("The queue: ");
    console.log(roamsr.state.queue);

    await roamsr.goToCurrentCard();

    roamsr.addKeyListener();

    // Change widget
    var widget = document.querySelector(".roamsr-widget")
    widget.innerHTML = "<div style='padding: 5px 0px'><span class='bp3-icon bp3-icon-cross'></span> END SESSION</div>";
    widget.onclick = roamsr.endSession;
  }
};

roamsr.endSession = async () => {
  window.onhashchange = () => { };
  console.log("Ending sesion.");

  // Change widget
  roamsr.removeSelector(".roamsr-widget");
  roamsr.addWidget();

  // Remove elements
  var doStuff = async () => {
    roamsr.removeContainer();
    roamsr.removeReturnButton();
    roamsr.setCustomStyle(false);
    roamsr.showAnswerAndCloze(false);
    roamsr.removeKeyListener();
    roamsr.goToUid();

    await roamsr.loadState(-1);
    roamsr.updateCounters();
  }

  await doStuff();
  await roamsr.sleep(200);
  await doStuff(); // ... again to make sure
  await roamsr.sleep(1000);
  await roamsr.loadState(-1);
  roamsr.updateCounters(); // ... once again
};

/* ====== UI ELEMENTS ====== */

// COMMON
roamsr.getCounter = (deck) => {
  // Getting the number of new cards
  var cardCount = [0, 0];
  if (roamsr.state.queue) {
    var remainingQueue = roamsr.state.queue.slice(Math.max(roamsr.state.currentIndex, 0));
    var filteredQueue = !deck ? remainingQueue : remainingQueue.filter((card) => card.decks.includes(deck));
    cardCount = filteredQueue.reduce((a, card) => {
      if (card.isNew) a[0]++;
      else a[1]++;
      return a;
    }, [0, 0]);
  }

  // Create the element
  var counter = Object.assign(document.createElement("div"), {
    className: "roamsr-counter",
    innerHTML: `<span style="color: dodgerblue; padding-right: 8px">` + cardCount[0] + `</span> <span style="color: green;">` + cardCount[1] + `</span>`,
  });
  return counter;
};

roamsr.updateCounters = () => {
  var counter = document.querySelectorAll(".roamsr-counter").forEach(counter => {
    counter.innerHTML = roamsr.getCounter().innerHTML;
    counter.style.cssText = !roamsr.state.limits ? "font-style: italic;" : "font-style: inherit;"
  })
};

// CONTAINER
roamsr.addContainer = () => {
  if (!document.querySelector(".roamsr-container")) {
    var wrapper = Object.assign(document.createElement("div"), {
      className: "flex-h-box roamsr-wrapper"
    })
    var container = Object.assign(document.createElement("div"), {
      className: "flex-v-box roamsr-container",
    });

    var flagButtonContainer = Object.assign(document.createElement("div"), {
      className: "flex-h-box roamsr-flag-button-container"
    });
    var flagButton = Object.assign(document.createElement("button"), {
      className: "bp3-button roamsr-button",
      innerHTML: "Flag.",
      onclick: async () => {
        await roamsr.flagCard();
        roamsr.stepToNext();
      }
    });
    var skipButton = Object.assign(document.createElement("button"), {
      className: "bp3-button roamsr-button",
      innerHTML: "Skip.",
      onclick: roamsr.stepToNext
    });
    flagButtonContainer.style.cssText = "justify-content: space-between;";
    flagButtonContainer.append(flagButton, skipButton);

    var responseArea = Object.assign(document.createElement("div"), {
      className: "flex-h-box roamsr-container__response-area"
    });

    container.append(roamsr.getCounter(), responseArea, flagButtonContainer);
    wrapper.append(container);

    var bodyDiv = document.querySelector(".roam-body-main");
    bodyDiv.append(wrapper);
  }
};

roamsr.removeContainer = () => {
  roamsr.removeSelector(".roamsr-wrapper");
};

roamsr.clearAndGetResponseArea = () => {
  var responseArea = document.querySelector(".roamsr-container__response-area");
  if (responseArea) responseArea.innerHTML = ""
  return responseArea;
};

roamsr.addShowAnswerButton = () => {
  var responseArea = roamsr.clearAndGetResponseArea();

  var showAnswerAndClozeButton = Object.assign(document.createElement("button"), {
    className: "bp3-button roamsr-container__response-area__show-answer-button roamsr-button",
    innerHTML: "Show answer.",
    onclick: () => { roamsr.showAnswerAndCloze(false); roamsr.addResponseButtons(); }
  })
  showAnswerAndClozeButton.style.cssText = "margin: 5px;";

  responseArea.append(showAnswerAndClozeButton);
};

roamsr.addResponseButtons = () => {
  var responseArea = roamsr.clearAndGetResponseArea();

  // Add new responses
  var responses = roamsr.getCurrentCard().algorithm(roamsr.getCurrentCard().history);
  for (response of responses) {
    const res = response;
    var responseButton = Object.assign(document.createElement("button"), {
      id: "roamsr-response-" + res.signal,
      className: "bp3-button roamsr-container__response-area__response-button roamsr-button",
      innerHTML: res.responseText + "<sup>" + roamsr.getIntervalHumanReadable(res.interval) + "</sup>",
      onclick: async () => {
        if (res.interval != 0) {
          roamsr.responseHandler(roamsr.getCurrentCard(), res.interval, res.signal.toString());
        } else {
          await roamsr.responseHandler(roamsr.getCurrentCard(), res.interval, res.signal.toString());
        }
        roamsr.stepToNext();
      }
    })
    responseButton.style.cssText = "margin: 5px;";
    responseArea.append(responseButton);
  }
};

// RETURN BUTTON
roamsr.addReturnButton = () => {
  var returnButtonClass = "roamsr-return-button-container";
  if (document.querySelector(returnButtonClass)) return;

  var main = document.querySelector(".roam-main");
  var body = document.querySelector(".roam-body-main");
  var returnButtonContainer = Object.assign(document.createElement("div"), {
    className: "flex-h-box " + returnButtonClass,
  });
  var returnButton = Object.assign(document.createElement("button"), {
    className: "bp3-button bp3-large roamsr-return-button",
    innerText: "Return.",
    onclick: roamsr.goToCurrentCard
  });
  returnButtonContainer.append(returnButton);
  main.insertBefore(returnButtonContainer, body);
};

roamsr.removeReturnButton = () => {
  roamsr.removeSelector(".roamsr-return-button-container");
};

// SIDEBAR WIDGET
roamsr.createWidget = () => {
  var widget = Object.assign(document.createElement("div"), {
    className: "log-button flex-h-box roamsr-widget",
  });
  widget.style.cssText = "align-items: center; justify-content: space-around; padding-top: 8px;"

  var reviewButton = Object.assign(document.createElement("div"), {
    className: "bp3-button bp3-minimal roamsr-widget__review-button",
    innerHTML: `<span style="padding-right: 8px;"><svg width="16" height="16" version="1.1" viewBox="0 0 4.2333 4.2333" style="color:5c7080;">
  <g id="chat_1_" transform="matrix(.26458 0 0 .26458 115.06 79.526)">
    <g transform="matrix(-.79341 0 0 -.88644 -420.51 -284.7)" fill="currentColor">
      <path d="m6 13.665c-1.1 0-2-1.2299-2-2.7331v-6.8327h-3c-0.55 0-1 0.61495-1 1.3665v10.932c0 0.7516 0.45 1.3665 1 1.3665h9c0.55 0 1-0.61495 1-1.3665l-5.04e-4 -1.5989v-1.1342h-0.8295zm9-13.665h-9c-0.55 0-1 0.61495-1 1.3665v9.5658c0 0.7516 0.45 1.3665 1 1.3665h9c0.55 0 1-0.61495 1-1.3665v-9.5658c0-0.7516-0.45-1.3665-1-1.3665z"
        clip-rule="evenodd" fill="currentColor" fill-rule="evenodd" />
    </g>
  </g></svg></span> REVIEW`,
    //  <span class="bp3-icon bp3-icon-chevron-down expand-icon"></span>`
    onclick: roamsr.startSession
  });
  reviewButton.style.cssText = "padding: 2px 8px;";

  var counter = Object.assign(roamsr.getCounter(), {
    className: "bp3-button bp3-minimal roamsr-counter",
    onclick: async () => {
      roamsr.state.limits = !roamsr.state.limits;
      roamsr.state.queue = await roamsr.loadCards();
      roamsr.updateCounters();
    }
  });
  var counterContainer = Object.assign(document.createElement("div"), {
    className: "flex-h-box roamsr-widget__counter",
  })
  counterContainer.style.cssText = "justify-content: center; width: 50%";
  counterContainer.append(counter);

  widget.append(reviewButton, counterContainer);

  return widget;
};

roamsr.addWidget = () => {
  if (!document.querySelector(".roamsr-widget")) {
    roamsr.removeSelector(".roamsr-widget-delimiter")
    var delimiter = Object.assign(document.createElement("div"), {
      className: "roamsr-widget-delimiter"
    });
    delimiter.style.cssText = "flex: 0 0 1px; background-color: rgb(57, 75, 89); margin: 8px 20px;";

    var widget = roamsr.createWidget();

    var sidebar = document.querySelector(".roam-sidebar-content");
    var starredPages = document.querySelector(".starred-pages-wrapper");

    sidebar.insertBefore(delimiter, starredPages);
    sidebar.insertBefore(widget, starredPages);
  }
};

/* ====== KEYBINDINGS ====== */
roamsr.processKey = (e) => {
  // console.log("alt: " + e.altKey + "  shift: " + e.shiftKey + "  ctrl: " + e.ctrlKey + "   code: " + e.code + "   key: " + e.key);
  if (document.activeElement.type == "textarea" || !location.href.includes(roamsr.getCurrentCard().uid)) {
    return;
  }

  var responses = roamsr.getCurrentCard().algorithm(roamsr.getCurrentCard().history);
  var handleNthResponse = async (n) => {
    console.log("Handling response: " + n)
    if (n >= 0 && n < responses.length) {
      const res = responses[n];
      if (res.interval != 0) {
        roamsr.responseHandler(roamsr.getCurrentCard(), res.interval, res.signal.toString());
      } else {
        await roamsr.responseHandler(roamsr.getCurrentCard(), res.interval, res.signal.toString());
      }
      roamsr.stepToNext();
    }
  }

    // Bindings for 123456789
    if (e.code.includes("Digit")) {
      var n = Math.min(parseInt(e.code.replace("Digit", "")) - 1, responses.length - 1);
      handleNthResponse(n);
      return;
    }

    // Bindings for hjkl
    const letters = ["KeyH", "KeyJ", "KeyK", "KeyL"];
    if (letters.includes(e.code)) {
      var n = Math.min(letters.indexOf(e.code), responses.length - 1);
      handleNthResponse(n);
      return;
    }

    if (e.code == "Space") {
      roamsr.showAnswerAndCloze(false); roamsr.addResponseButtons();
      return;
    }

    if (e.code == "KeyF") {
      roamsr.flagCard().then(() => {
        roamsr.stepToNext();
      });
      return;
    }

    if (e.code == "KeyS") {
      roamsr.stepToNext();
      return;
    }

    if (e.code == "KeyD" && e.altKey) {
      roamsr.endSession();
      return;
    }
};

roamsr.processKeyAlways = (e) => {
  // Alt+enter TODO
} 

roamsr.addKeyListener = () => {
    document.addEventListener("keydown", roamsr.processKey);
};

roamsr.removeKeyListener = () => {
    document.removeEventListener("keydown", roamsr.processKey);
};

/* ====== {{sr}} BUTTON ====== */
roamsr.buttonClickHandler = async (e) => {
  if (e.target.tagName === 'BUTTON' && e.target.textContent === roamsr.settings.mainTag) {
    var block = e.target.closest('.roam-block');
    if (block) {
      var uid = block.id.substring(block.id.length - 9);
      const q = `[:find (pull ?page
                    [{:block/children [:block/uid :block/string]}])
                :in $ ?uid
                :where [?page :block/uid ?uid]]`;
      var results = await window.roamAlphaAPI.q(q, uid);
      if (results.length == 0) return;
      var children = results[0][0].children;
      for (child of children) {
        window.roamAlphaAPI.updateBlock({
          block: {
            uid: child.uid,
            string: child.string.trim() + ' #' + roamsr.settings.mainTag
          }
        });
      }
    }
  }
}

document.addEventListener("click", roamsr.buttonClickHandler, false);

/* ====== CALLING FUNCTIONS DIRECTLY ====== */

console.log("🗃️ Loading roam/sr " + VERSION + ".");

roamsr.loadSettings();
roamsr.addBasicStyles();
roamsr.loadState(-1).then(res => {
  roamsr.addWidget();
});

console.log("🗃️ Successfully loaded roam/sr " + VERSION + ".");