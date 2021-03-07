import { isNew } from "./loadingCards";

test("isNew", () => {
	// having a ref on an older daily page does NOT mean the card is not new
	let res = { _refs: [{ page: { uid: "01-28-2020" } }] };
	let dateBasis = new Date("2021-01-28");
	expect(isNew(res, dateBasis)).toBe(true);

	// however, having a ref on an older daily page under the review-parent DOES mean the card is not new
	res = { _refs: [{ page: { uid: "01-28-2020" }, _children: [{ refs: [{ title: "roam/sr/review" }] }] }] };
	dateBasis = new Date("2021-01-28");
	expect(isNew(res, dateBasis)).toBe(false);

	// having a ref under the current review-parent means it has been repeated today and is not new
	res = { _refs: [{ page: { uid: "01-28-2021" }, _children: [{ refs: [{ title: "roam/sr/review" }] }] }] };
	dateBasis = new Date("2021-01-28");
	expect(isNew(res, dateBasis)).toBe(false);

	// having a ref under a future review-parent means it has been repeated already and is not new
	res = { _refs: [{ page: { uid: "01-28-2022" }, _children: [{ refs: [{ title: "roam/sr/review" }] }] }] };
	dateBasis = new Date("2021-01-28");
	expect(isNew(res, dateBasis)).toBe(false);

	// having no _refs with _children means the card is new, because no review-blocks exist then
	res = { _refs: [{ page: { uid: "01-28-2021" } }] };
	dateBasis = new Date("2021-01-28");
	expect(isNew(res, dateBasis)).toBe(true);
});
