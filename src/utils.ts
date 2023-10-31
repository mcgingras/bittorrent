import fs from "fs";
import http from "http";
import https from "https";
import crypto from "crypto";

export async function request(
  url: string,
  method = "GET",
  headers = {},
  body = null as Buffer | null
): Promise<Buffer> {
  let httpModule = http;
  // @ts-ignore
  if (url.startsWith("https")) httpModule = https;
  return new Promise((resolve, reject) => {
    const req = httpModule.request(url, { method, headers }, (res) => {
      const chunks = [] as any[];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        // check if moved permanently
        if (
          res.statusCode! >= 300 &&
          res.statusCode! < 400 &&
          res.headers.location
        ) {
          const newPath = new URL(res.headers.location, url).toString();
          request(newPath, method, headers, body).then(resolve).catch(reject);
        } else if (res.statusCode! >= 400) {
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

const isUrlSafe = (char: string) => /[a-zA-Z0-9\-\._~]/.test(char);

const urlEncodeBytes = (buf: Buffer) => {
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
export function sha1URL(data: string | Buffer) {
  const hash = crypto.createHash("sha1");
  hash.update(data);
  const buffer = hash.digest();
  return urlEncodeBytes(buffer);
}

export const sha1 = (input: string | Buffer) => {
  return crypto.createHash("sha1").update(input).digest("hex");
};

export const sha1Buffer = (input: string | Buffer) => {
  const hash = crypto.createHash("sha1");
  hash.update(input);
  return hash.digest();
};

export const createOrOpenFile = (outputFilePath: string) => {
  let file;
  try {
    file = fs.openSync(outputFilePath, "r+");
    return file;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      file = fs.openSync(outputFilePath, "w+");
      fs.closeSync(file);
      file = fs.openSync(outputFilePath, "r+");
      return file;
    } else {
      throw error;
    }
  }
};

export async function runByTimeOrThrow(
  fn: Function,
  time: number
): Promise<any> {
  async function timeout(ms: number) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Operation timed out after " + ms + "ms"));
      }, ms);
    });
  }

  await Promise.race([fn(), timeout(time)]);
}
