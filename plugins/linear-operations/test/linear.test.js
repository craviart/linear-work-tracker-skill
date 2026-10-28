const assert = require("node:assert/strict");
const test = require("node:test");
const linear = require("../server/linear");

test("accepts well-formed issue IDs and rejects malformed IDs", () => {
  assert.match("DST-380", linear.ISSUE_ID);
  assert.doesNotMatch("dst-380", linear.ISSUE_ID);
});

test("classifies DNS failures with a recovery action", () => {
  const error = linear.classifyFailure("dns error: failed to lookup address information");
  assert.equal(error.code, "NETWORK_UNAVAILABLE");
  assert.match(error.message, /linear_health/);
});

test("rejects searches that can accidentally span teams", () => {
  assert.throws(() => linear.issueSearch({ search: "welcome" }), { code: "INVALID_ARGUMENT" });
});

test("requires a concrete update field", () => {
  assert.throws(() => linear.issueUpdate({ issueId: "DST-380" }), { code: "INVALID_ARGUMENT" });
});

test("requires typed create ownership fields", () => {
  assert.throws(() => linear.issueCreate({ title: "Test", team: "DST", assignee: "self" }), { code: "INVALID_ARGUMENT" });
});
