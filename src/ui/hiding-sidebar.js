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
                ...opts
            });
            _event.simulated = true;
            element.dispatchEvent(_event);
        });
    }, 0);
};

export const showLeftSidebar = async () => {
    var firstButton = document.querySelector(".bp3-icon-menu")
    var secondButton = document.querySelector(".bp3-icon-menu-open")
    simulateMouseEvents(firstButton, ["mouseover"])
    await sleep(50);
    simulateMouseEvents(secondButton, ["mousedown", "click", "mouseup"])
}

export const hideLeftSidebar = () => {
    try {
        document.getElementsByClassName("bp3-icon-menu-closed")[0].click();
    } catch (e) { }
}
