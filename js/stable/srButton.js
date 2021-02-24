export const buttonClickHandler = async (e) => {
	if (e.target.tagName === "BUTTON" && e.target.textContent === roamsr.settings.mainTag) {
		var block = e.target.closest(".roam-block");
		if (block) {
			var uid = block.id.substring(block.id.length - 9);
			const q = `[:find (pull ?page
                    [{:block/children [:block/uid :block/string]}])
                :in $ ?uid
                :where [?page :block/uid ?uid]]`;
			var results = await window.roamAlphaAPI.q(q, uid);
			if (results.length == 0) return;
			var children = results[0][0].children;
			for (let child of children) {
				window.roamAlphaAPI.updateBlock({
					block: {
						uid: child.uid,
						string: child.string.trim() + " #" + roamsr.settings.mainTag,
					},
				});
			}
		}
	}
};
