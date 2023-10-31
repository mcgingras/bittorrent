export const bencodeToBuffer = (s: any): Buffer => {
  if (s.length === 0) {
    throw new Error("Cannot encode empty string");
  }

  if (typeof s === "string") {
    return encodeString(s);
  } else if (typeof s === "number") {
    return encodeInteger(s);
  } else if (Array.isArray(s)) {
    return encodeList(s);
  } else if (typeof s === "object") {
    return encodeDictionary(s);
  } else {
    throw new Error(`Unknown type ${typeof s}`);
  }
};

const encodeString = (s: string) => {
  return Buffer.from(`${s.length}:${s}`);
};

const encodeInteger = (i: number) => {
  return Buffer.from(`i${i}e`);
};

const encodeList = (l: string[]) => {
  return Buffer.concat([
    Buffer.from("l"),
    ...l.map((item) => bencodeToBuffer(item)),
    Buffer.from("e"),
  ]);
};

const encodeDictionary = (d: any) => {
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
