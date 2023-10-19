const process = require("process");
const util = require("util");

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
  if (!isNaN(bencodedValue[0])) {
    // Check if the first character is a digit
    const parts = bencodedValue.split(":");
    const length = parseInt(parts[0], 10);
    return parts[1].substr(0, length);
  } else {
    // must be number for now
    // remove first and last chars
    const num = bencodedValue.slice(1, -1);
    return parseInt(num, 10);
  }
}

function main() {
  const command = process.argv[2];

  // Uncomment this block to pass the first stage
  if (command === "decode") {
    const bencodedValue = process.argv[3];

    // In JavaScript, there's no need to manually convert bytes to string for printing
    // because JS doesn't distinguish between bytes and strings in the same way Python does.
    console.log(JSON.stringify(decodeBencode(bencodedValue)));
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
