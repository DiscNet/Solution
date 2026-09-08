const test = require("node:test");
const assert = require("node:assert/strict");
const { extractMessageText } = require("../functions/messageText");

test("interactive quick replies are converted back into command text", () => {
  assert.equal(
    extractMessageText({
      message: {
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: JSON.stringify({ id: ".akinator sim deadbeef" }),
          },
        },
      },
    }),
    ".akinator sim deadbeef",
  );

  assert.equal(
    extractMessageText({
      message: {
        ephemeralMessage: {
          message: {
            listResponseMessage: {
              singleSelectReply: { selectedRowId: ".akinator voltar deadbeef" },
            },
          },
        },
      },
    }),
    ".akinator voltar deadbeef",
  );
});

test("Akinator command exposes the expected game metadata", () => {
  const command = require("../commands/brincadeiras/akinator");
  assert.equal(command.name, "akinator");
  assert.ok(command.aliases.includes("aki"));
  assert.equal(command.menuCategory, "Brincadeiras");
  assert.equal(command.menuSection, "Jogos");
  assert.match(command.usage, /voltar/);
  assert.match(command.usage, /provavelmentenao/);
});
