const http = require("http");
const https = require("https");
const crypto = require("crypto");

const getSHA1ofJSON = (input) => {
  return crypto.createHash("sha1").update(input).digest("hex");
};

async function request(url, method = "GET", headers = {}, body = null) {
  var httpModule = http;
  if (url.startsWith("https")) httpModule = https;
  return new Promise((resolve, reject) => {
    const req = httpModule.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        // check if moved permanently
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const newPath = new URL(res.headers.location, url).toString();
          request(newPath, method, headers, body).then(resolve).catch(reject);
        } else if (res.statusCode >= 400) {
          reject(
            new Error(
              `Request failed with status code ${res.statusCode}: ${body}`
            )
          );
        } else resolve(body);
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const isUrlSafe = (char) => /[a-zA-Z0-9\-\._~]/.test(char);

const urlEncodeBytes = (buf) => {
  let encoded = "";
  for (let i = 0; i < buf.length; i++) {
    const charBuf = Buffer.from("00", "hex");
    charBuf.writeUInt8(buf[i]);
    const char = charBuf.toString();
    // if the character is safe, then just print it, otherwise encode
    if (isUrlSafe(char)) {
      encoded += char;
    } else {
      encoded += `%${charBuf.toString("hex").toUpperCase()}`;
    }
  }
  return encoded;
};

/** Hashes data using SHA-1 and URL encodes raw bytes (valid chars remain the same, while non-printable are encoded with %) */
function sha1URL(data) {
  const hash = crypto.createHash("sha1");
  hash.update(data);
  const buffer = hash.digest();
  return urlEncodeBytes(buffer);
}

module.exports = {
  request,
  getSHA1ofJSON,
  sha1URL,
};
