const bencodeToBuffer = (s) => {
  if (s.length === 0) {
    return;
  }

  if (typeof s === "string") {
    return encodeString(s);
  } else if (typeof s === "number") {
    return encodeInteger(s);
  } else if (Array.isArray(s)) {
    return encodeList(s);
  } else if (typeof s === "object") {
    return encodeDictionary(s);
  }
};

const encodeString = (s) => {
  return Buffer.from(`${s.length}:${s}`);
};

const encodeInteger = (i) => {
  return Buffer.from(`i${i}e`);
};

const encodeList = (l) => {
  return Buffer.concat([
    Buffer.from("l"),
    ...l.map((item) => bencodeToBuffer(item)),
    Buffer.from("e"),
  ]);
};

const encodeDictionary = (d) => {
  const sortedKeys = Object.keys(d).sort();
  const encodedDictionary = sortedKeys.reduce((acc, curr) => {
    if (curr === "pieces") {
      return Buffer.concat([
        acc,
        encodeString(curr),
        Buffer.concat([Buffer.from(`${d[curr].length}:`), d[curr]]),
      ]);
    }
    return Buffer.concat([acc, encodeString(curr), bencodeToBuffer(d[curr])]);
  }, Buffer.from("d"));
  return Buffer.concat([encodedDictionary, Buffer.from("e")]);
};

module.exports = {
  bencodeToBuffer,
};
