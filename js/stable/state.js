// possible states
// inquiry: roaming around, "Return"-button is visible
// review: answer closed
// test: answer open
// standby: in Roam

// all mutation of state is located here

export const setStatus = (status) => {
	console.log("roamsr is entering state: " + status);
	roamsr.state = { ...roamsr.state, status };
};

export const reviewState = () => setStatus("review");
export const testState = () => setStatus("test");
export const inquiryState = () => setStatus("inquiry");
export const standbyState = () => setStatus("standby");

export const setCards = (queue, extraCards) => {
	roamsr.state = { ...roamsr.state, queue, extraCards };
};

export const incrementCurrentCardIndex = () => {
	roamsr.state.currentIndex++;
};

export const addCardToQueue = (card) => {
	roamsr.state.queue.push(card);
};

export const addExtraCardToQueue = (j) => {
	const extraCard = roamsr.state.extraCards[j].shift();
	if (extraCard) roamsr.state.queue.push(extraCard);
};

export const setLimitActivation = (activation) => {
	roamsr.state = { ...roamsr.state, limits: activation };
};

export const toggleLimitActivation = () => {
	roamsr.state.limits = !roamsr.state.limits;
};

export const setCurrentCardIndex = (index) => {
	roamsr.state.currentIndex = index;
};
