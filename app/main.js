const process = require("process");
const fs = require("fs");
const crypto = require("crypto");
const { bencodeToBuffer } = require("./encode-buffer.js");
const { decodeBufferBencode } = require("./decode-buffer.js");

const getSHA256ofJSON = (input) => {
  return crypto.createHash("sha1").update(input).digest("hex");
};

function main() {
  const command = process.argv[2];

  try {
    if (command === "decode") {
      const rawValue = process.argv[3];
      var buf = Buffer.from(rawValue, "utf8");
      console.log(JSON.stringify(decodeBufferBencode(buf)));
    } else if (command === "info") {
      const filePath = process.argv[3];
      const data = fs.readFileSync(filePath);
      const value = decodeBufferBencode(data);
      const bencodeInfo = bencodeToBuffer(value.info);
      console.log(`Tracker URL: ${value.announce}`);
      console.log(`Length: ${value.info.length}`);
      console.log(`Info Hash: ${getSHA256ofJSON(bencodeInfo)}`);
    } else {
      throw new Error(`Unknown command ${command}`);
    }
  } catch (e) {
    console.log(e);
  }
}

main();
