const defaultConfig = {
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

const getLastFail = (history) => (history ? history.map((review) => review.signal).lastIndexOf("1") : 0);

const isLearningPhase = (config, history) => history.length == 0 || history.length <= config.firstFewIntervals.length;

const getLearningPhaseResponses = (config, history) => {
	return [
		{
			responseText: config.responseTexts[0],
			signal: 1,
			interval: 0,
		},
		{
			responseText: config.responseTexts[2],
			signal: 3,
			interval: config.firstFewIntervals[history ? Math.max(history.length - 1, 0) : 0],
		},
	];
};

const getDelay = (hist, prevInterval) => {
	if (hist && hist.length > 1)
		return Math.max(
			(hist[hist.length - 1].date - hist[hist.length - 2].date) / (1000 * 60 * 60 * 24) - prevInterval,
			0
		);
	else return 0;
};

const getRetainingPhaseResponses = (config, history) => {
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
		return interval + (-jitter + Math.random() * jitter);
	};

	var getResponse = (signal) => {
		return {
			responseText: config.responseTexts[parseInt(signal) - 1],
			signal: signal,
			interval: Math.floor(
				addJitter(calculateNewParams(finalFactor, finalInterval, getDelay(history, finalInterval), signal)[1])
			),
		};
	};
	return [getResponse("1"), getResponse("2"), getResponse("3"), getResponse("4")];
};

export const ankiScheduler = (userConfig) => {
	const config = Object.assign(defaultConfig, userConfig);

	var algorithm = (history) => {
		var lastFail = getLastFail(history);
		history = history ? (lastFail == -1 ? history : history.slice(lastFail + 1)) : [];

		if (isLearningPhase(config, history)) {
			return getLearningPhaseResponses(config, history);
		} else {
			return getRetainingPhaseResponses(config, history);
		}
	};
	return algorithm;
};
