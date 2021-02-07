// ------------------
// --- Converters ---
// ------------------

roamsr.convertV0toV1 = async () => {
  console.log("Starting to convert. Doing 15 cards per minute.")

  var queryResult;
  do {
    var queryResult = window.roamAlphaAPI.q('[:find (pull ?tip [:block/uid :block/string :block/order {:block/parents [:block/uid]} {:block/page [:block/uid]} {:block/_refs [:block/uid :block/string :block/order {:block/page [:block/uid]}]}]) :where [?tip :block/refs ?sr] [?sr :node/title "sr"] [?tip :block/refs ?delta] [?delta :node/title "∆"]]')
    var v0cards = queryResult.slice(0, 15).map(result => {
      if (!result[0]._refs) return result[0];
      else {
        return result[0]._refs.concat(result[0]).sort((a, b) => {
          var getDate = d => {
            return isNaN(new Date(d)) ? 0 : new Date(d);
          }
          return getDate(a.page.uid) - getDate(b.page.uid);
        });
      }
    })

    await v0cards.map(async v0card => {
      console.log("Before: ");
      console.log(v0card);
      // Move under a bullet and update contents
      v0card = [v0card[0]].concat(v0card.slice(1).map(review => {
        var queryReviewBlock = window.roamAlphaAPI.q('[:find (pull ?reviewBlock [:block/uid]) :in $ ?dailyNoteUID :where [?reviewBlock :block/refs ?reviewPage] [?reviewPage :node/title "roam/sr/review"] [?dailyNote :block/children ?reviewBlock] [?dailyNote :block/uid ?dailyNoteUID]]', review.page.uid)

        // Check if there's the block
        var uid;
        if (queryReviewBlock.length == 0) {
          uid = roamsr.createUid();
          window.roamAlphaAPI.createBlock({
            location: {
              "parent-uid": review.page.uid,
              order: 0
            },
            block: {
              string: "[[roam/sr/review]]",
              uid: uid
            }
          });
        } else uid = queryReviewBlock[0][0].uid;
        review.parents = [{ uid: uid }];

        // Move
        window.roamAlphaAPI.moveBlock({
          location: {
            "parent-uid": uid,
            order: 0
          },
          block: {
            uid: review.uid
          }
        })
        return review;
      }));
      await new Promise(r => setTimeout(r, 50));
      // Swap tip and back
      var tip = v0card[v0card.length - 1];
      var back = v0card[0];
      var swap = (a, b) => {
        window.roamAlphaAPI.moveBlock({
          location: {
            "parent-uid": a.parents ? a.parents[0].uid : a.page.uid,
            order: a.order
          },
          block: {
            uid: b.uid
          }
        });
      }
      swap(back, tip);
      swap(tip, back);

      // Remove delta from the main block (fuck you!)
      v0card[v0card.length - 1].string = v0card[v0card.length - 1].string.replace(/\s*\#h\s*/g, "").replace(/\s*\{\{\[\[∆\]\]:[0-9]+\+[0-9]+\}\}\s*/g, "")
      window.roamAlphaAPI.updateBlock({
        block: {
          uid: v0card[v0card.length - 1].uid,
          string: v0card[v0card.length - 1].string
        }
      });
      v0card.slice(0, -1).map(review => {
        review.string = "((" + v0card[v0card.length - 1].uid + "))";
        if (v0card.indexOf(review) != v0card.length - 2) review.string += " #r/3";
        window.roamAlphaAPI.updateBlock({
          block: {
            uid: review.uid,
            string: review.string
          }
        })
        return review;
      });
      console.log("After: ");
      console.log(v0card);
      return v0card;
    });
    console.log("Waiting for 1 minute now.")
    await new Promise(r => setTimeout(r, 1000 * 61))
    console.log("Finished waiting.")
  } while (queryResult.length != 0)

    console.log("Finished converting.")
}