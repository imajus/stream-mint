## Day 1 Morning (3–4 h)

- [x] **Repo & env setup**
  - Initialize monorepo (contracts / backend / frontend)
  - Configure env vars: Pinata API key, YouTube-replay API URL, Flare & Xsolla RPC keys, private keys
  - Install core deps: Hardhat, ethers.js, React, Next.js (or CRA), Node.js libs (ytdl-core, ffmpeg-static, pinata-sdk)
- [x] **YouTube video extractor & IPFS upload**
  - CLI script: download via ytdl-core, split into N WebM chunks (ffmpeg)
  - Pin chunks to IPFS (Pinata SDK) → output JSON manifest of URIs
- [ ] **ERC-721 NFT contract**
  - Write minimal ERC-721 with `setMetadata(tokenId, score, gifHash)` (only callable by bridge)
  - Hardhat tests for mint & updateScore
  - Deploy script to Xsolla testnet

## Day 1 Afternoon (3–4 h)

- [ ] **NFT Factory & Browser Integration**
  - Users trigger NFT pack creation directly from the browser by interacting with the NFT factory smart contract
  - UI for pack creation: user provides YouTube URL and # of NFTs, triggers contract call, receives contract address and chunk URIs
- [ ] **Flare oracle contract**
  - Simple contract that reads JSON from your public YouTube-replay API via Flare's Web2 JSON oracle
  - Expose an event with `(videoId, [chunkScores])` array
  - Deploy on Flare public testnet (Coston2)
- [ ] **Bridge relayer service**
  - Node.js service:
    1. Listen for oracle events on Flare
    2. For each chunk score, call Xsolla NFT contract's `setScore` with tokenId mapping
  - Basic retry & log
- [ ] **Video Data Extraction & FDC Submission (Browser)**
  - The user initiates an HTTP request to the Video Data Extractor API via the browser
  - The API returns a list of video chunks with: (a) index, (b) IPFS hash of GIF image, (c) score float value
  - The browser processes this data using Flare FDC (Web2Json attestation)
  - The browser submits the chunk data and FDC proof to a custom Smart Contract on the Flare blockchain

## Day 2 Morning (3–4 h)

- [ ] **Frontend MVP**
  - **Create Pack** page:
    - Form (YouTube URL, # of NFTs) → user triggers NFT factory contract → shows mint contract address + chunk previews
  - **Minting** page:
    - Fetch chunk URIs + metadata → user wallet → `mint()` on Xsolla contract
  - **Trigger Scores** button:
    - Browser calls Video Data Extractor API → processes with FDC → submits to Flare contract → shows loading
  - **Results** display:
    - Poll on-chain metadata: fetch updated `score` + `gifURI` → show GIF + normalized 0–1 score bar
- [ ] **Deploy Frontend** to Cloudflare Pages, point to your backend

## Day 2 Midday (1–2 h): Testing & Demo

- [ ] **End-to-end run-through**
  1. Create pack for sample YouTube stream (via browser + NFT factory)
  2. Mint 3–5 NFTs in wallet
  3. Trigger video data extraction and FDC proof submission from browser → bridge → on-chain updates
  4. UI displays GIF + scores
- [ ] **Fix show-stopper bugs** (UX, chain errors, CORS)
- [ ] **Demo script & slides**
  - 5 min flow: no-code creation → minting → automated score update → market implications
  - Highlight decentralization (Flare oracle + cross-chain bridge)
