const bencode = (s) => {
  if (s.length === 0) {
    return;
  }

  if (typeof s === "string") {
    return encodeString(s);
  } else if (typeof s === "number") {
    return encodeNumber(s);
  } else if (Array.isArray(s)) {
    return encodeList(s);
  } else if (typeof s === "object") {
    return encodeDictionary(s);
  }
};

const encodeString = (s) => {
  return `${s.length}:${s}`;
};

const encodeNumber = (s) => {
  return `i${s}e`;
};

const encodeList = (s) => {
  return (
    s.reduce((acc, curr) => {
      return `${acc}${bencode(curr)}`;
    }, `l`) + `e`
  );
};

const encodePiecesBinary = (hexString) => {
  if (hexString.length % 40 !== 0) {
    throw new Error(
      "Invalid hex string for pieces: Length must be a multiple of 40"
    );
  }

  let binaryString = "";
  for (let i = 0; i < hexString.length; i += 2) {
    const byte = parseInt(hexString.substr(i, 2), 16);
    binaryString += String.fromCharCode(byte);
  }
  return binaryString;
};

const encodeDictionary = (d) => {
  return (
    Object.keys(d)
      .sort()
      .reduce((acc, curr) => {
        if (curr === "pieces") {
          return `${acc}${encodeString(curr)}${encodePiecesBinary(d[curr])}`;
        }
        return `${acc}${encodeString(curr)}${bencode(d[curr])}`;
      }, `d`) + `e`
  );
};

module.exports = {
  bencode,
};
