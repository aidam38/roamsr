import { calcNewFactorAndInterval, defaultConfig } from "./ankiScheduler";

test("calcNewFactorAndInterval", () => {
	// always "good" response, sanity check
	const signal = "3";
	let factor = defaultConfig.defaultFactor;
	let interval = 6;

	// bigger than 7 results in the maximum interval
	for (let n = 0; n < 8; n++) {
		const [tempFac, tempInter] = calcNewFactorAndInterval(defaultConfig, factor, interval, 0, signal);

		// if "good" factor never changes
		expect(tempFac).toBe(defaultConfig.defaultFactor);
		// if "good" interval grows via the default factor
		expect(tempInter).toBe(interval * defaultConfig.defaultFactor);

		factor = tempFac;
		interval = tempInter;
	}
});
