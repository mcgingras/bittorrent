const net = require("net");

const createHandshake = async ({ peerAddress, peerPort, infoHash, peerId }) => {
  const handshake = Buffer.alloc(68);
  handshake.writeUInt8(19, 0); // length of the protocol string
  handshake.write("BitTorrent protocol", 1); // protocol string
  handshake.writeUInt32BE(0, 20); // 8 reserved bytes
  handshake.writeUInt32BE(0, 24);
  infoHash.copy(handshake, 28); // infohash
  peerId.copy(handshake, 48); // peer id

  const socket = net.connect(peerPort, peerAddress);
  socket.on("connect", () => {
    socket.write(handshake);
  });
  const response = await new Promise((resolve, reject) => {
    socket.on("data", (data) => {
      resolve(data);
      socket.end();
    });
    socket.on("error", reject);
  });
  const protocolLength = response.readUInt8(0);
  const infohashResponse = response.slice(
    protocolLength + 9,
    protocolLength + 29
  );
  const peerIdResponse = response.slice(
    protocolLength + 29,
    protocolLength + 49
  );
  // check if the infohash matches
  if (infohashResponse.toString() !== infoHash.toString()) {
    throw new Error(
      `Infohash mismatch: expected ${infoHash.toString()}, got ${infohashResponse.toString()}`
    );
  }
  return peerIdResponse.toString("hex");
};

module.exports = { createHandshake };
