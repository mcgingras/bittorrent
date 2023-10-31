[![progress-banner](https://backend.codecrafters.io/progress/bittorrent/22275c11-8399-414e-b71e-d47baf406db1)](https://app.codecrafters.io/users/mcgingras?r=2qF)

This is a starting point for JavaScript solutions to the
["Build Your Own BitTorrent" Challenge](https://app.codecrafters.io/courses/bittorrent/overview).

In this challenge, you’ll build a BitTorrent client that's capable of parsing a
.torrent file and downloading a file from a peer. Along the way, we’ll learn
about how torrent files are structured, HTTP trackers, BitTorrent’s Peer
Protocol, pipelining and more.

**Note**: If you're viewing this repo on GitHub, head over to
[codecrafters.io](https://codecrafters.io) to try the challenge.

# Passing the first stage

The entry point for your BitTorrent implementation is in `app/main.js`. Study
and uncomment the relevant code, and push your changes to pass the first stage:

```sh
git add .
git commit -m "pass 1st stage" # any msg
git push origin master
```

Time to move on to the next stage!

# Stage 2 & beyond

Note: This section is for stages 2 and beyond.

1. Ensure you have `node (18)` installed locally
1. Run `./your_bittorrent.sh` to run your program, which is implemented in
   `app/main.js`.
1. Commit your changes and run `git push origin master` to submit your solution
   to CodeCrafters. Test output will be streamed to your terminal.

### Commands to copy

```
./your_bittorrent.sh decode 5:hello
./your_bittorrent.sh decode i52e
./your_bittorrent.sh decode l5:helloi52ee
./your_bittorrent.sh decode d3:foo3:bar5:helloi52ee
./your_bittorrent.sh info sample.torrent
./your_bittorrent.sh peers sample.torrent
./your_bittorrent.sh handshake sample.torrent 178.62.85.20:51489
./your_bittorrent.sh download_piece -o ./test.txt sample.torrent 0
./your_bittorrent.sh download -o ./test.txt sample.torrent
```
