"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runByTimeOrThrow = exports.createOrOpenFile = exports.sha1Buffer = exports.sha1 = exports.sha1URL = exports.request = void 0;
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const crypto_1 = __importDefault(require("crypto"));
async function request(url, method = "GET", headers = {}, body = null) {
    let httpModule = http_1.default;
    // @ts-ignore
    if (url.startsWith("https"))
        httpModule = https_1.default;
    return new Promise((resolve, reject) => {
        const req = httpModule.request(url, { method, headers }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const body = Buffer.concat(chunks);
                // check if moved permanently
                if (res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    res.headers.location) {
                    const newPath = new URL(res.headers.location, url).toString();
                    request(newPath, method, headers, body).then(resolve).catch(reject);
                }
                else if (res.statusCode >= 400) {
                    reject(new Error(`Request failed with status code ${res.statusCode}: ${body}`));
                }
                else
                    resolve(body);
            });
        });
        req.on("error", reject);
        if (body)
            req.write(body);
        req.end();
    });
}
exports.request = request;
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
        }
        else {
            encoded += `%${charBuf.toString("hex").toUpperCase()}`;
        }
    }
    return encoded;
};
/** Hashes data using SHA-1 and URL encodes raw bytes (valid chars remain the same, while non-printable are encoded with %) */
function sha1URL(data) {
    const hash = crypto_1.default.createHash("sha1");
    hash.update(data);
    const buffer = hash.digest();
    return urlEncodeBytes(buffer);
}
exports.sha1URL = sha1URL;
const sha1 = (input) => {
    return crypto_1.default.createHash("sha1").update(input).digest("hex");
};
exports.sha1 = sha1;
const sha1Buffer = (input) => {
    const hash = crypto_1.default.createHash("sha1");
    hash.update(input);
    return hash.digest();
};
exports.sha1Buffer = sha1Buffer;
const createOrOpenFile = (outputFilePath) => {
    let file;
    try {
        file = fs_1.default.openSync(outputFilePath, "r+");
        return file;
    }
    catch (error) {
        if (error.code === "ENOENT") {
            file = fs_1.default.openSync(outputFilePath, "w+");
            fs_1.default.closeSync(file);
            file = fs_1.default.openSync(outputFilePath, "r+");
            return file;
        }
        else {
            throw error;
        }
    }
};
exports.createOrOpenFile = createOrOpenFile;
async function runByTimeOrThrow(fn, time) {
    async function timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Operation timed out after " + ms + "ms"));
            }, ms);
        });
    }
    await Promise.race([fn(), timeout(time)]);
}
exports.runByTimeOrThrow = runByTimeOrThrow;
