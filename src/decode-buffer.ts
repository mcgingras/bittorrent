// Constants
const BYTES_E = 0x65;
const BYTES_I = 0x69;
const BYTES_L = 0x6c;
const BYTES_D = 0x64;
const BYTES_0 = 0x30;
const BYTES_9 = 0x39;
const BYTES_COLON = 0x3a;

const parseString = (
  buffer: Buffer,
  startingIndex: number,
  returnAsBuffer = false
) => {
  let index = startingIndex;
  let lengthStr = "";
  while (buffer[index] !== BYTES_COLON) {
    lengthStr += String.fromCharCode(buffer[index]);
    index++;
  }
  index++; // Skip ':'
  const length = parseInt(lengthStr, 10);
  const str = buffer.slice(index, index + length);
  index += length;
  return {
    value: returnAsBuffer ? str : str.toString("utf8"),
    length: index - startingIndex,
  };
};

const parseInteger = (buffer: Buffer, startingIndex: number) => {
  let index = startingIndex + 1; // Skip 'i'
  let numStr = "";
  while (buffer[index] !== BYTES_E) {
    numStr += String.fromCharCode(buffer[index]);
    index++;
  }
  index++; // Skip 'e'
  return { value: parseInt(numStr, 10), length: index - startingIndex };
};

const parseList = (
  buffer: Buffer,
  startingIndex: number
): { value: any[]; length: number } => {
  let index = startingIndex + 1; // Skip 'l'
  const list = [];
  while (buffer[index] !== BYTES_E) {
    const { value, length } = parseItem(buffer, index);
    list.push(value);
    index += length;
  }
  index++; // Skip 'e'
  return { value: list, length: index - startingIndex };
};

const parseDictionary = (buffer: Buffer, startingIndex: number) => {
  let index = startingIndex + 1; // Skip 'd'
  const dict = {};
  while (buffer[index] !== BYTES_E) {
    const { value: key, length: keyLength } = parseString(buffer, index);
    index += keyLength;
    const isBinaryField = ["pieces", "peers"].includes(key.toString());
    const { value, length } = parseItem(buffer, index, isBinaryField);
    // @ts-ignore
    dict[key] = value;
    index += length;
  }
  index++; // Skip 'e'
  return { value: dict, length: index - startingIndex };
};

function parseItem(buffer: Buffer, startIndex: number, returnAsBuffer = false) {
  const type = buffer[startIndex];
  if (type >= BYTES_0 && type <= BYTES_9) {
    return parseString(buffer, startIndex, returnAsBuffer);
  } else if (type === BYTES_I) {
    return parseInteger(buffer, startIndex);
  } else if (type === BYTES_L) {
    return parseList(buffer, startIndex);
  } else if (type === BYTES_D) {
    return parseDictionary(buffer, startIndex);
  } else {
    throw new Error(`Unknown type ${type}`);
  }
}

export function decodeBufferBencode(buffer: Buffer) {
  const { value } = parseItem(buffer, 0);
  return value;
}
