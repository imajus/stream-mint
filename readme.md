# No-Code NFT Pack Builder for YouTube Videos

## Concept

This project provides a simple, fully-decentralized (\*) no-code interface for creators to mint and distribute NFT packs tied to portions of YouTube videos. Each pack consists of a configurable number of NFTs, where:

- Every NFT corresponds to a unique, equal-length segment of the video.
- After the video is processed, each segment is rendered and attached to its NFT.
- A "replay score" derived from YouTube's most-replayed statistics is fetched via a trustless oracle and assigned to each token.
- Higher scores reflect the most-viewed or most-replayed moments, driving scarcity and value in secondary markets.

The concept works particularly well with upcoming videos (such as live streams), introducing an element of intrigue as buyers won't know which NFTs will capture the most valuable moments until after the content goes live.

Behind the scenes:

1. A Node.js extractor pulls and splits the video into WebM chunks and pins them to IPFS.
2. A smart contract on Xsolla blockchain issues ERC-721 NFTs with metadata links to each chunk.
3. A custom-made oracle bridges YouTube replay metrics from web2 to the blockchain.
4. The oracle relays scores to the NFT contract on Xsolla blockchain, triggering on-chain metadata updates.
5. A lightweight web UI lets creators spin up collections, fans mint tokens, and everyone view live GIFs and scores.

The result is an end-to-end, hackathon-ready proof-of-concept that showcases custom oracle implementation, web2-to-blockchain data bridging, and dynamic NFT metadata—all running on Xsolla blockchain.

(\*): For the purposes of the prototype implementation I had to step out from the full decentralisation, particularly with the custom oracle solution which is suitable for demonstration but would need significant improvements for production use.

## Demo

The project demo is available [here](https://stream-mint.pages.dev/).

## How it's made

- The project solely works on Xsolla ZK blockchain
- The Xsolla ZK starter kit was used for smart contract & Xsolla ZK UI kit for the frontend development
- Address of deployed Smart Mint NFT Factory contract is `0x0b7b69Ab9a71c839E4817E12f1d9069d6d8d81bC` (see in the [explorer](https://x.la/explorer/address/0x0b7b69Ab9a71c839E4817E12f1d9069d6d8d81bC))
- The project uses Trigger.dev for running video processing tasks
