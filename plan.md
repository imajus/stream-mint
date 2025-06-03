## Day 1 Morning (3–4 h)

- [x] **Repo & env setup**
  - Initialize monorepo (contracts / backend / frontend)
  - Configure env vars: Pinata API key, YouTube-replay API URL, Flare & Xsolla RPC keys, private keys
  - Install core deps: Hardhat, ethers.js, React, Next.js (or CRA), Node.js libs (ytdl-core, ffmpeg-static, pinata-sdk)
- [x] **YouTube video extractor & IPFS upload**
  - CLI script: download via ytdl-core, split into N WebM chunks (ffmpeg)
  - Pin chunks to IPFS (Pinata SDK) → output JSON manifest of URIs
- [ ] **ERC-721 NFT contract**
  - Write minimal ERC-721 with `mint(to, tokenURI)` + `setScore(tokenId, score, gifURI)` (only callable by bridge)
  - Hardhat tests for mint & updateScore
  - Deploy script to Xsolla testnet

## Day 1 Afternoon (3–4 h)

- [ ] **Flare oracle contract**
  - Simple contract that reads JSON from your public YouTube-replay API via Flare’s Web2 JSON oracle
  - Expose an event with `(videoId, [chunkScores])` array
  - Deploy on Flare public testnet (Coston2)
- [ ] **Bridge relayer service**
  - Node.js service:
    1. Listen for oracle events on Flare
    2. For each chunk score, call Xsolla NFT contract’s `setScore` with tokenId mapping
  - Basic retry & log
- [ ] **Backend endpoints**
  - `/api/create-pack`: run CLI extractor, deploy new NFT contract, return contract address + chunk URIs
  - `/api/trigger-oracle`: call Flare oracle to fetch fresh replay data

## Day 2 Morning (3–4 h)

- [ ] **Frontend MVP**
  - **Create Pack** page:
    - Form (YouTube URL, # of NFTs) → calls `/api/create-pack` → shows mint contract address + chunk previews
  - **Minting** page:
    - Fetch chunk URIs + metadata → user wallet → `mint()` on Xsolla contract
  - **Trigger Scores** button:
    - Calls `/api/trigger-oracle` → shows loading
  - **Results** display:
    - Poll on-chain metadata: fetch updated `score` + `gifURI` → show GIF + normalized 0–1 score bar
- [ ] **Deploy Frontend** to Cloudflare Pages, point to your backend

## Day 2 Midday (1–2 h): Testing & Demo

- [ ] **End-to-end run-through**
  1. Create pack for sample YouTube stream
  2. Mint 3–5 NFTs in wallet
  3. Trigger oracle → bridge → on-chain updates
  4. UI displays GIF + scores
- [ ] **Fix show-stopper bugs** (UX, chain errors, CORS)
- [ ] **Demo script & slides**
  - 5 min flow: no-code creation → minting → automated score update → market implications
  - Highlight decentralization (Flare oracle + cross-chain bridge)
