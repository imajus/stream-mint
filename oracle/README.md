# Stream Mint Oracle

## Overview

Stream Mint Oracle is a blockchain-based video processing service that automatically downloads, processes, and transforms video content into time-segmented NFTs. This oracle service acts as a bridge between video content and blockchain, creating unique NFT collections where each token represents a specific time segment of the original video.

## Key Features

### 🎥 Video Processing

- **Automated Video Download**: Downloads videos from external URLs using optimized streaming techniques
- **Intelligent Chunking**: Splits videos into equal time segments for tokenization
- **Quality Analysis**: Evaluates each segment using custom scoring algorithms
- **Multi-format Support**: Handles various video formats with WebM output optimization

### 🔗 Blockchain Integration

- **Smart Contract Interaction**: Reads metadata from StreamMintNFT contracts on Xsolla ZK Sepolia Testnet
- **Automated Token URI Setting**: Programmatically assigns metadata URIs to NFT tokens
- **Quality-based Minting**: Uses content analysis to determine segment quality scores

### 📁 IPFS Storage

- **Decentralized Storage**: Uploads video segments and metadata to IPFS via Pinata
- **Dual Asset Creation**: Generates both JPEG thumbnails and WebM video segments
- **Metadata Management**: Creates comprehensive NFT metadata with attributes and external links

### ⚡ Automation & Performance

- **Trigger.dev Integration**: Serverless task execution with configurable timeouts
- **Parallel Processing**: Concurrent blockchain transactions for optimal performance
- **Error Handling**: Robust error recovery and transaction monitoring

## Technical Architecture

### Dependencies

- **Video Processing**: FFmpeg integration for video manipulation
- **Blockchain**: Viem for Ethereum client operations
- **Storage**: IPFS integration via Pinata API
- **Automation**: Trigger.dev for serverless execution
- **File Management**: fs-extra for enhanced file operations

### Environment Requirements

- `PINATA_JWT`: Pinata API access token for IPFS uploads
- `PRIVATE_KEY`: Ethereum private key for blockchain transactions
- `CURL_TIMEOUT`: Download timeout configuration (default: 3 hours)
- `SCORE_THRESHOLD`: Quality scoring threshold (default: 0.3)

### Processing Workflow

1. **Contract Reading**: Extracts video URL and metadata from StreamMintNFT contract
2. **Video Download**: Downloads source video using libcurl with proxy support
3. **Content Analysis**: Fetches quality periods data from external API
4. **Segmentation**: Splits video into equal-duration chunks
5. **Asset Generation**: Creates JPEG thumbnails and WebM segments for each chunk
6. **IPFS Upload**: Stores all assets on decentralized storage
7. **Metadata Creation**: Generates comprehensive NFT metadata with quality scores
8. **Blockchain Update**: Updates contract with tokenURI for each segment

## Smart Contract Integration

The oracle works with StreamMintNFT contracts that expose:

- `videoUrl()`: Source video URL
- `description()`: Collection description
- `maxSupply()`: Maximum number of tokens
- `setTokenURI(tokenId, uri)`: Updates individual token metadata

## Quality Scoring

Each video segment receives a quality score based on:

- **Time-based Analysis**: Overlap with high-quality periods
- **Content Evaluation**: External API assessment
- **Threshold Filtering**: Configurable quality standards

## NFT Metadata Structure

Each token includes:

- **Visual Assets**: JPEG thumbnail and WebM video segment
- **Temporal Attributes**: Start time, end time, duration
- **Quality Metrics**: Calculated quality score
- **External References**: Link to original video source

## Development

### Setup

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Deployment

```bash
npm run deploy
```
