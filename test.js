const process = require("process");
const fs = require("fs");
const { request, getSHA256ofJSON } = require("./app/utils.js");
const { bencodeToBuffer } = require("./app/encode-buffer.js");
const { decodeBufferBencode } = require("./app/decode-buffer.js");

async function main() {
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
    } else if (command === "peers") {
      const filePath = process.argv[3];
      const data = fs.readFileSync(filePath);
      const value = decodeBufferBencode(data);
      const bencodeInfo = bencodeToBuffer(value.info);

      const trackerURL = value.announce;

      const info_hash = encodeURIComponent(
        getSHA256ofJSON(bencodeInfo).toString("binary")
      );
      const peer_id = "11112233445566778899";
      const port = 6881;
      const uploaded = 0;
      const downloaded = 0;
      const left = value.info.length;
      const compact = 1;

      console.log(info_hash);

      const url = `${trackerURL}?info_hash=${info_hash}&peer_id=${peer_id}&port=${port}&uploaded=${uploaded}&downloaded=${downloaded}&left=${left}&compact=${compact}`;
      const response = await request(url);
      console.log(decodeBufferBencode(response));
    } else {
      throw new Error(`Unknown command ${command}`);
    }
  } catch (e) {
    console.log("error", e);
  }
}

main();
