// Teacher registration Step 4, the contract screen: the signature rules, the mapping of the agreement answer and the
// in-page signature preview (utils/teacherContract.js). No server needed. Run: npm run verify:teacher-contract
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACT_STATE,
  formatSignDate,
  hasSignatureArea,
  isSafeImageUrl,
  mapContractDetails,
  previewContractWithSignature,
  publishDateTimeText,
  validateSignatureFile,
} from "../utils/teacherContract.js";

const answer = (patch = {}, status = "1") => ({
  status,
  details: {
    teacherAgreementDetails: {
      contractState: "READY",
      agreementLogId: 7,
      content: "<p>Terms</p>",
      salutation: "Ms",
      name: "Aazim Shaikh",
      city: "Singapore",
      state: "Central",
      country: "Singapore",
      publishDateText: "Nov 16, 2026",
      publishTimeText: "06:30 PM",
      schoolAddress: "1 Road",
      ...patch,
    },
  },
});

test("a signature is a JPG or PNG of at most 300 KB", () => {
  assert.equal(validateSignatureFile({ type: "image/png", size: 1000 }), null);
  assert.equal(validateSignatureFile({ type: "image/jpeg", size: 300 * 1024 }), null);
  assert.equal(validateSignatureFile({ type: "IMAGE/JPG", size: 10 }), null);
  assert.equal(validateSignatureFile({ type: "image/png", size: 300 * 1024 + 1 }), "File size must be less than 300 KB.");
  assert.equal(validateSignatureFile({ type: "image/gif", size: 10 }), "Only JPG or PNG images are allowed.");
  assert.equal(validateSignatureFile({ type: "", size: 10 }), "Only JPG or PNG images are allowed.");
  assert.equal(validateSignatureFile(null), "Please upload your signature");
});

test("a failed or malformed answer maps to null", () => {
  assert.equal(mapContractDetails(null), null);
  assert.equal(mapContractDetails({ status: "0" }), null);
  assert.equal(mapContractDetails({ status: "1", details: {} }), null);
});

test("a ready contract carries everything the screen shows, and blanks where the data has none", () => {
  const mapped = mapContractDetails(answer());
  assert.equal(mapped.state, CONTRACT_STATE.READY);
  assert.deepEqual(
    [mapped.contract.agreementLogId, mapped.contract.recipientName, mapped.contract.locationLine, mapped.contract.schoolAddress],
    ["7", "Ms. Aazim Shaikh", "Singapore, Central, Singapore", "1 Road"]
  );
  const bare = mapContractDetails(answer({ salutation: undefined, city: undefined, state: "", country: undefined })).contract;
  assert.equal(bare.recipientName, "Aazim Shaikh");
  assert.equal(bare.locationLine, "");
});

test("the state is the backend's, an unknown one or a ready one with nothing to show is not ready", () => {
  assert.equal(mapContractDetails(answer({ contractState: "EXPIRED" })).state, CONTRACT_STATE.EXPIRED);
  assert.equal(mapContractDetails(answer({ contractState: "constructor" })).state, CONTRACT_STATE.NOT_READY);
  assert.equal(mapContractDetails(answer({ content: "  " })).state, CONTRACT_STATE.NOT_READY);
  assert.equal(mapContractDetails(answer({ agreementLogId: 0 })).contract, null);
  assert.equal(mapContractDetails({ status: "1", details: { teacherAgreementDetails: { contractState: "NOT_READY" } } }).state, "NOT_READY");
});

test("only a web address is used as the letterhead", () => {
  assert.equal(isSafeImageUrl("https://cdn.example/l.png"), true);
  assert.equal(isSafeImageUrl("javascript:alert(1)"), false);
  assert.equal(isSafeImageUrl("data:image/png;base64,AAAA"), false);
  assert.equal(mapContractDetails(answer({ letterHeadImage: "javascript:alert(1)" })).contract.letterHeadImage, "");
  assert.equal(mapContractDetails(answer({ letterHeadImage: "https://cdn.example/l.png" })).contract.letterHeadImage, "https://cdn.example/l.png");
});

const ADMIN_TABLE =
  '<p>Terms</p><table><tr><td><div id="leftSignatureBox"><img src="data:image/png;base64,AAAA"></div></td>' +
  '<td><div id="rightSignatureBox" style="min-height:80px;"></div></td></tr><tr><td>Date: <span id="rightDate">____</span></td></tr></table>';

test("the signature and the date show where the admin left room for them", () => {
  assert.equal(hasSignatureArea(ADMIN_TABLE), true);
  const preview = previewContractWithSignature(ADMIN_TABLE, "data:image/png;base64,QUJD", "Nov-16-2026");
  assert.ok(preview.includes('<div id="rightSignatureBox" style="min-height:80px;"><img src="data:image/png;base64,QUJD"'));
  assert.ok(preview.includes('<span id="rightDate">Nov-16-2026</span>'));
  assert.ok(preview.includes('<div id="leftSignatureBox"><img src="data:image/png;base64,AAAA"></div>'));
});

test("a contract without the box has no signature area and is left as it is", () => {
  assert.equal(hasSignatureArea("<p>No box</p>"), false);
  assert.equal(previewContractWithSignature("<p>No box</p>", "data:image/png;base64,QUJD", "d"), "<p>No box</p>");
  assert.equal(hasSignatureArea('<div data-id="rightSignatureBox"></div>'), false);
  assert.equal(previewContractWithSignature(ADMIN_TABLE, "", "d"), ADMIN_TABLE);
});

test("nested markup inside the box is replaced with it", () => {
  const html = "<DIV ID='rightSignatureBox'><div><p>old</p></div><br></DIV><b>after</b>";
  const preview = previewContractWithSignature(html, "data:image/png;base64,QUJD", "d");
  assert.ok(!preview.includes("old"));
  assert.ok(preview.endsWith("</DIV><b>after</b>"));
});

test("the sign date and the publish date-time read like the legacy page", () => {
  assert.equal(formatSignDate(new Date(2026, 10, 6)), "Nov 06, 2026");
  assert.equal(formatSignDate(new Date(2026, 10, 17)), "Nov 17, 2026");
  assert.equal(publishDateTimeText({ publishDate: "Nov 16, 2026", publishTime: "06:30 PM" }), "Nov 16, 2026 06:30 PM");
  assert.equal(publishDateTimeText({ publishDate: "Nov 16, 2026", publishTime: "" }), "Nov 16, 2026");
  assert.equal(publishDateTimeText(null), "");
});
