const process = require("process");
const util = require("util");

const parseString = (s) => {
  const parts = s.split(":");
  const length = parseInt(parts[0], 10);
  return parts[1].substr(0, length);
};

const parseNumber = (s) => {
  const end = s.indexOf("e");
  if (end === -1) {
    throw new Error(`Invalid integer ${s}`);
  }
  const num = s.slice(1, end);
  return parseInt(num, 10);
};

const parseList = (s) => {
  const list = [];
  // remove "l" from the start and "e" from the end
  let data = s.slice(1, -1);
  while (data.length > 0) {
    const result = decodeBencode(data);
    list.push(result);
    if (Array.isArray(result)) {
      data = "";
    } else {
      data = data.slice(result.toString().length + 2);
    }
  }
  return list;
  //
};

const parseDict = (s) => {
  return s;
};

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
// - decodeBencode("i123e") -> 123
// - decodeBencode("i-123e") -> -123
// - decodeBencode("li123e3:abce") -> [123, "abc"]
function decodeBencode(bencodedValue) {
  // first character is a digit (length of string)
  if (!isNaN(bencodedValue[0])) {
    return parseString(bencodedValue);
    // i represents an integer
  } else if (bencodedValue[0] === "i") {
    return parseNumber(bencodedValue);
    // l represents a list
  } else if (bencodedValue[0] === "l") {
    return parseList(bencodedValue);
  } else {
    throw new Error(`Unknown bencode value ${bencodedValue}`);
  }
}

function main() {
  const command = process.argv[2];

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
