# No-Code NFT Pack Builder for YouTube Live Streams

## Concept

This project provides a simple, fully-decentralized (\*) no-code interface for creators to mint and distribute NFT packs tied to portions of an upcoming YouTube live stream. Each pack consists of a configurable number of NFTs, where:

- Every NFT corresponds to a unique, equal-length segment of the future video.
- After the stream concludes, each segment is rendered and attached to its NFT.
- A “replay score” derived from YouTube’s most-replayed statistics is fetched via a trustless oracle and assigned to each token.
- Higher scores reflect the most-viewed or most-replayed moments, driving scarcity and value in secondary markets.

Behind the scenes:

1. A Node.js extractor pulls and splits the video into WebM chunks and pins them to IPFS.
2. A smart contract on Xsolla ZK issues ERC-721 NFTs with metadata links to each chunk.
3. Flare Network’s Web2-JSON oracle ingests YouTube replay metrics.
4. A cross-chain bridge securely relays scores to the NFT contract, triggering on-chain updates.
5. A lightweight web UI lets creators spin up collections, fans mint tokens, and everyone view live GIFs and scores.

The result is an end-to-end, hackathon-ready proof-of-concept that showcases decentralized oracles, cross-chain messaging, and dynamic NFT metadata—without writing a single smart contract by hand.

(\*): For the purposes of the prototype implementation I had to step out from the full decentralisation.
