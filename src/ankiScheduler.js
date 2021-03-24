export const defaultConfig = {
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

// TODO: this might be a problem because its not "totally" accurate
// https://swizec.com/blog/a-day-is-not-606024-seconds-long
const dayInMiliseconds = 1000 * 60 * 60 * 24;

const getDelay = (history, prevInterval) => {
	if (history && history.length > 1) {
		const milisecondsSincePenultimateReview = history[history.length - 1].date - history[history.length - 2].date;

		return Math.max(milisecondsSincePenultimateReview / dayInMiliseconds - prevInterval, 0);
	} else return 0;
};

const addJitter = (config, interval) => {
	const jitter = interval * config.jitterPercentage;
	return interval + (-jitter + Math.random() * jitter);
};

const calcNewFactor = (config, prevFactor, signal) => {
	switch (signal) {
		case "1":
			return prevFactor - 0.2;
		case "2":
			return prevFactor - config.factorModifier;
		case "3":
			return prevFactor;
		case "4":
			return prevFactor + config.factorModifier;
		default:
			return prevFactor;
	}
};

const calcNewInterval = (config, prevFactor, prevInterval, delay, signal) => {
	let newInterval;

	switch (signal) {
		case "1":
			newInterval = 0;
			break;

		case "2":
			newInterval = prevInterval * config.hardFactor;
			break;

		case "3":
			newInterval = (prevInterval + delay / 2) * prevFactor;
			break;

		case "4":
			newInterval = (prevInterval + delay) * prevFactor * config.easeBonus;
			break;

		default:
			newInterval = prevInterval * prevFactor;
			break;
	}

	return Math.min(newInterval, config.maxInterval);
};

export const calcNewFactorAndInterval = (config, prevFactor, prevInterval, delay, signal) => {
	return [calcNewFactor(config, prevFactor, signal), calcNewInterval(config, prevFactor, prevInterval, delay, signal)];
};

// to get the last factor and interval, we go through the (signal-)history
// and simulate each decision to arrive at each intermediate factor and interval
const calcLastFactorAndInterval = (config, history) => {
	if (!history || history.length <= config.firstFewIntervals.length) {
		return [config.defaultFactor, config.firstFewIntervals[config.firstFewIntervals.length - 1]];
	} else {
		const [prevFactor, prevInterval] = calcLastFactorAndInterval(config, history.slice(0, -1));
		return calcNewFactorAndInterval(
			config,
			prevFactor,
			prevInterval,
			getDelay(history, prevInterval),
			history[history.length - 1].signal
		);
	}
};

const getRetainingPhaseResponse = (config, finalFactor, finalInterval, signal, history) => {
	return {
		responseText: config.responseTexts[parseInt(signal) - 1],
		signal: signal,
		interval: Math.floor(
			addJitter(config, calcNewInterval(config, finalFactor, finalInterval, getDelay(history, finalInterval), signal))
		),
	};
};

const getRetainingPhaseResponses = (config, history) => {
	const [finalFactor, finalInterval] = calcLastFactorAndInterval(config, history.slice(0, -1));

	return [
		getRetainingPhaseResponse(config, finalFactor, finalInterval, "1", history),
		getRetainingPhaseResponse(config, finalFactor, finalInterval, "2", history),
		getRetainingPhaseResponse(config, finalFactor, finalInterval, "3", history),
		getRetainingPhaseResponse(config, finalFactor, finalInterval, "4", history),
	];
};

export const ankiScheduler = (userConfig) => {
	const config = Object.assign(defaultConfig, userConfig);

	const algorithm = (history) => {
		const lastFail = getLastFail(history);
		history = history ? (lastFail == -1 ? history : history.slice(lastFail + 1)) : [];

		if (isLearningPhase(config, history)) {
			return getLearningPhaseResponses(config, history);
		} else {
			return getRetainingPhaseResponses(config, history);
		}
	};
	return algorithm;
};
