import { sleep } from "../core/helperFunctions";

// simulateClick by Viktor Tabori
const simulateMouseEvents = (element, events, opts) => {
	setTimeout(function () {
		events.forEach(function (type) {
			var _event = new MouseEvent(type, {
				view: window,
				bubbles: true,
				cancelable: true,
				buttons: 1,
				...opts,
			});
			_event.simulated = true;
			element.dispatchEvent(_event);
		});
	}, 0);
};

export const showLeftSidebar = async () => {
	var firstButton = document.querySelector(".bp3-icon-menu");
	console.log(firstButton);
	if (firstButton) {
		simulateMouseEvents(firstButton, ["mouseover"]);
		await sleep(150);
		var secondButton = document.querySelector(".bp3-icon-menu-open");
		secondButton.click();
	}
};

export const hideLeftSidebar = () => {
	try {
		document.getElementsByClassName("bp3-icon-menu-closed")[0].click();
	} catch (e) {}
};
