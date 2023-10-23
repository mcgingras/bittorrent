const process = require("process");
const util = require("util");

const parseString = (s) => {
  const firstColon = s.indexOf(":");
  const length = parseInt(s.slice(0, firstColon));
  const value = s.substr(firstColon + 1, length);
  return { value, length: firstColon + 1 + length };
};

const parseNumber = (s) => {
  const end = s.indexOf("e");
  if (end === -1) {
    throw new Error(`Invalid integer ${s}`);
  }
  const num = s.slice(1, end);
  return { value: parseInt(num, 10), length: num.length + 2 };
};

const parseList = (s) => {
  if (s[0] !== "l") {
    throw new Error("Expected a list");
  }

  const list = [];
  let data = s.slice(1);

  while (data[0] !== "e") {
    if (data.length === 0) {
      throw new Error("Unexpected end of data while parsing list");
    }
    const { value, length } = decodeBencode(data);
    list.push(value);
    data = data.slice(length);
  }
  return { value: list, length: s.length - data.length + 1 };
};

const parseDictionary = (s) => {
  const dict = {};
  let data = s.slice(1);

  while (data[0] !== "e") {
    if (data.length === 0) {
      throw new Error("Unexpected end of data while parsing dictionary");
    }

    const { value: k, length: keyLength } = decodeBencode(data);
    data = data.slice(keyLength);
    const { value: v, length: valueLength } = decodeBencode(data);
    data = data.slice(valueLength);

    dict[k] = v;
  }

  return { value: dict, length: s.length - data.length + 1 };
};

// Examples:
// - decodeBencode("5:hello") -> "hello"q
// - decodeBencode("10:hello12345") -> "hello12345"
// - decodeBencode("i123e") -> 123
// - decodeBencode("i-123e") -> -123
// - decodeBencode("li123e3:abce") -> [123, "abc"]
// - decodeBencode("d3:foo3:bar5:helloi52ee") -> { foo: "bar", hello: 52 }
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
    // d represents a dictionary
  } else if (bencodedValue[0] === "d") {
    return parseDictionary(bencodedValue);
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
    console.log(JSON.stringify(decodeBencode(bencodedValue).value));
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
