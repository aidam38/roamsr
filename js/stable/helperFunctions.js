export const sleep = (m) => {
	var t = m ? m : 10;
	return new Promise((r) => setTimeout(r, t));
};

export const createUid = () => {
	// From roam42 based on https://github.com/ai/nanoid#js version 3.1.2
	let nanoid = (t = 21) => {
		let e = "",
			r = crypto.getRandomValues(new Uint8Array(t));
		for (; t--; ) {
			let n = 63 & r[t];
			e += n < 36 ? n.toString(36) : n < 62 ? (n - 26).toString(36).toUpperCase() : n < 63 ? "_" : "-";
		}
		return e;
	};
	return nanoid(9);
};

export const removeSelector = (selector) => {
	document.querySelectorAll(selector).forEach((element) => {
		element.remove();
	});
};

export const goToUid = (uid) => {
	var baseUrl = "/" + new URL(window.location.href).hash.split("/").slice(0, 3).join("/");
	var url = uid ? baseUrl + "/page/" + uid : baseUrl;
	location.assign(url);
};

export const getFuckingDate = (str) => {
	if (!str) return null;
	let strSplit = str.split("-");
	if (strSplit.length != 3) return null;
	try {
		let date = new Date(strSplit[2] + "-" + strSplit[0] + "-" + strSplit[1]);
		date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
		return date;
	} catch (e) {
		console.log(e);
	}
};

export const getRoamDate = (date) => {
	if (!date || date == 0) date = new Date();

	var months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];
	var suffix = ((d) => {
		if (d > 3 && d < 21) return "th";
		switch (d % 10) {
			case 1:
				return "st";
			case 2:
				return "nd";
			case 3:
				return "rd";
			default:
				return "th";
		}
	})(date.getDate());

	var pad = (n) => n.toString().padStart(2, "0");

	var roamDate = {
		title: months[date.getMonth()] + " " + date.getDate() + suffix + ", " + date.getFullYear(),
		uid: pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "-" + date.getFullYear(),
	};

	return roamDate;
};

export const getIntervalHumanReadable = (n) => {
	if (n == 0) return "<10 min";
	else if (n > 0 && n <= 15) return n + " d";
	else if (n <= 30) return (n / 7).toFixed(1) + " w";
	else if (n <= 365) return (n / 30).toFixed(1) + " m";
};
