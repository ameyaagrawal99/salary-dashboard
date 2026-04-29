import assert from "node:assert/strict";

import {
  buildGoogleFormsPlan,
  type BuilderForm,
} from "../client/src/lib/google-forms-builder";

const form: BuilderForm = {
  id: "test-form",
  title: "Test form",
  description: "A test form",
  collectEmail: true,
  requireSignIn: false,
  steps: [
    {
      id: "step-1",
      title: "Step 1",
      description: "",
      sections: [
        {
          id: "section-1",
          title: "Section 1",
          description: "",
          repeatMode: "single",
          slotCount: 1,
          fields: [
            {
              id: "grid-1",
              label: "Publication counts",
              type: "grid",
              required: false,
              helpText: "",
              options: ["Indian", "International", "Total"],
              rows: ["Journal publication", "Conference proceedings"],
              width: "full",
            },
          ],
        },
      ],
    },
  ],
};

const plan = buildGoogleFormsPlan(form);

assert.deepEqual(plan.batchUpdatePayload.requests[0], {
  updateSettings: {
    settings: {
      emailCollectionType: "VERIFIED",
    },
    updateMask: "emailCollectionType",
  },
});

const gridRequest = plan.batchUpdatePayload.requests.find((request) => {
  const item = request.createItem?.item;
  return item?.title === "Publication counts";
});

assert.ok(gridRequest, "expected the grid question to be exported");
assert.deepEqual(
  gridRequest.createItem.item.questionGroupItem.questions.map(
    (question: { rowQuestion: { title: string } }) => question.rowQuestion.title,
  ),
  ["Journal publication", "Conference proceedings"],
);

console.log("google-forms-builder tests passed");
