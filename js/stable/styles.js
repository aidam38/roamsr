const basicCSS = `
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
  pointer-events: none;
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
  pointer-events: all;
}

.roamsr-response-area {
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 15px;
}

.roamsr-flag-button-container {
  width: 100%;
}
`;

export const addBasicStyles = () => {
	var basicStyles = Object.assign(document.createElement("style"), {
		id: "roamsr-css-basic",
		innerHTML: basicCSS,
	});
	document.getElementsByTagName("head")[0].appendChild(basicStyles);
};

export const setCustomStyle = (yes) => {
	var styleId = "roamsr-css-custom";
	var element = document.getElementById(styleId);
	if (element) element.remove();

	if (yes) {
		// Query new style
		var styleQuery = window.roamAlphaAPI.q(
			`[:find (pull ?style [:block/string]) :where [?roamsr :node/title "roam\/sr"] [?roamsr :block/children ?css] [?css :block/refs ?roamcss] [?roamcss :node/title "roam\/css"] [?css :block/children ?style]]`
		);

		// this is necessary because having three ` breaks Roam-code-blocks
		// other solutions have lead to the minifier appending three `
		const replaceStrPartial = "``";

		if (styleQuery && styleQuery.length != 0) {
			var customStyle = styleQuery[0][0].string
				.replace("`" + replaceStrPartial + "css", "")
				.replace("`" + replaceStrPartial, "");

			var roamsrCSS = Object.assign(document.createElement("style"), {
				id: styleId,
				innerHTML: customStyle,
			});

			document.getElementsByTagName("head")[0].appendChild(roamsrCSS);
		}
	}
};

const roamsrMainviewCSSID = "roamsr-css-mainview";

const removeRoamsrMainviewCSS = () => {
	const element = document.getElementById(roamsrMainviewCSSID);
	if (element) element.remove();
};

export const showAnswerAndCloze = removeRoamsrMainviewCSS;

export const hideAnswerAndCloze = () => {
	removeRoamsrMainviewCSS();

	const clozeStyle = roamsr.settings.clozeStyle || "highlight";
	const style = `
    .roam-article .rm-reference-main,
    .roam-article .rm-block-children
    {
      visibility: hidden;  
    }

    .roam-article .rm-${clozeStyle} {
      background-color: #cccccc;
      color: #cccccc;
    }`;

	const basicStyles = Object.assign(document.createElement("style"), {
		id: roamsrMainviewCSSID,
		innerHTML: style,
	});
	document.getElementsByTagName("head")[0].appendChild(basicStyles);
};
