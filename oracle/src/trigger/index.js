import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import * as child_process from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from "util";
import { Curl } from 'node-libcurl';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import StreamMintNFTArtifact from '../abis/StreamMintNFT.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables for Pinata
const PINATA_JWT = process.env.PINATA_JWT;

// Environment variable for private key
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const CURL_TIMEOUT = process.env.CURL_TIMEOUT ?? 3 * 60 * 60;

const SCORE_THRESHOLD = process.env.SCORE_THRESHOLD ?? 0.3;

if (!PINATA_JWT) {
  throw new Error('PINATA_JWT environment variable is required');
}

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

// Define the chain configuration once to reuse it
const xsollaChain = {
  id: 555272,
  name: 'Xsolla ZK Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://zkrpc.xsollazk.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Xsolla Explorer',
      url: 'https://x.la/explorer',
    },
  },
  testnet: true,
};

// Ethereum client setup
const client = createPublicClient({
  chain: xsollaChain,
  transport: http()
});

// Create wallet client for transaction signing
const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: xsollaChain,
  transport: http()
});

// Use the StreamMintNFT ABI from the imported artifact
const streamMintNFTAbi = StreamMintNFTArtifact.abi;

// Function to read NFT metadata from StreamMintNFT blockchain contract
async function readNFTMetadata(nftAddress) {
  try {
    logger.info("Reading StreamMintNFT metadata from blockchain", { nftAddress });
    
    // Read maxSupply from the contract
    const maxSupply = await client.readContract({
      address: nftAddress,
      abi: streamMintNFTAbi,
      functionName: 'maxSupply'
    });
    
    // Read videoUrl directly from the contract
    const videoURL = await client.readContract({
      address: nftAddress,
      abi: streamMintNFTAbi,
      functionName: 'videoUrl'
    });
    
    // Read description directly from the contract
    const description = await client.readContract({
      address: nftAddress,
      abi: streamMintNFTAbi,
      functionName: 'description'
    });
    
    if (!videoURL) {
      throw new Error("No video URL found in StreamMintNFT contract");
    }
    
    logger.info("Successfully read StreamMintNFT metadata", { 
      videoURL,
      description: description?.substring(0, 100) + "...",
      maxSupply: maxSupply.toString(),
    });
    
    return {
      videoURL,
      maxSupply: Number(maxSupply),
    };
  } catch (error) {
    logger.error("Failed to read StreamMintNFT metadata", { nftAddress, error: error.message });
    throw error;
  }
}

// Select the smallest resolution video stream
function selectSmallestVideoStream(videoStreams) {
  if (!videoStreams || videoStreams.items.length === 0) {
    throw new Error('No video streams available');
  }
  // Sort by quality (height) ascending to get the smallest
  const sortedStreams = videoStreams.items
    .filter(stream => stream.extension === 'webm')
    .sort((a, b) => a.size - b.size);
  if (sortedStreams.length === 0) {
    throw new Error('No valid video streams found');
  }
  logger.info("Selected smallest video stream", sortedStreams[0]);
  return sortedStreams[0];
}

// Download video from URL
const downloadVideo = promisify((url, outputPath, callback) => {
  const curl = new Curl();
  const writeStream = fs.createWriteStream(outputPath);
  // Set basic options
  curl.setOpt('URL', url);
  curl.setOpt('FOLLOWLOCATION', true); // Follow redirects (equivalent to curl -L)
  curl.setOpt('TIMEOUT', Math.floor(CURL_TIMEOUT)); // Convert ms to seconds
  curl.setOpt('WRITEFUNCTION', (buffer, size, nmemb) => {
    const length = size * nmemb;
    writeStream.write(buffer.subarray(0, length));
    return length;
  });
  // Automatically configure proxy from environment variables
  if (process.env.CURL_PROXY) {
    const proxyUrl = process.env.CURL_PROXY;
    curl.setOpt('PROXY', proxyUrl);
    // Handle proxy authentication if included in URL
    const proxyMatch = proxyUrl.match(/^https?:\/\/([^:]+):([^@]+)@/);
    if (proxyMatch) {
      curl.setOpt('PROXYUSERPWD', `${proxyMatch[1]}:${proxyMatch[2]}`);
    }
  }
  curl.on('end', (statusCode, data, headers) => {
    writeStream.end();
    if (statusCode >= 200 && statusCode < 300) {
      callback(null);
    } else {
      // Clean up the file on error
      fs.unlink(outputPath, () => {});
      callback(new Error(`HTTP error! status: ${statusCode}`));
    }
    curl.close();
  });
  curl.on('error', (error) => {
    writeStream.end();
    // Clean up the file on error
    fs.unlink(outputPath, () => {});
    callback(new Error(`Download failed: ${error.message}`));
    curl.close();
  });
  curl.perform();
});

// Upload file to IPFS using Pinata HTTP API
async function uploadToIPFS(filePath, fileName) {
  try {
    logger.info("Uploading file to IPFS via Pinata API", { filePath, fileName });
    
    // Read the file buffer
    const fileBuffer = await fs.readFile(filePath);
    
    // Detect MIME type based on file extension
    let mimeType = 'application/octet-stream'; // default
    const extension = path.extname(fileName).toLowerCase();
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.webm':
        mimeType = 'video/webm';
        break;
      case '.mp4':
        mimeType = 'video/mp4';
        break;
      case '.mov':
        mimeType = 'video/quicktime';
        break;
    }
    
    // Create FormData for multipart upload
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, fileName);
    formData.append('network', 'public');
    
    // Optional: Add metadata
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        originalPath: filePath,
        uploadedAt: new Date().toISOString(),
        mimeType: mimeType
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Make the API request
    const response = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    logger.info("File uploaded to IPFS successfully", { 
      fileName,
      cid: result.data.cid,
      size: result.data.size,
      id: result.data.id,
      mimeType: mimeType
    });
    
    return {
      ipfsHash: result.data.cid,
      pinataId: result.data.id,
      pinSize: result.data.size,
      timestamp: result.data.created_at,
      mimeType: result.data.mime_type,
      isDuplicate: result.data.is_duplicate || false
    };
  } catch (error) {
    logger.error("Failed to upload file to IPFS", { 
      fileName, 
      error: error.message 
    });
    throw error;
  }
}

// Upload JSON data to IPFS using Pinata HTTP API
async function uploadJSONToIPFS(jsonData, fileName) {
  try {
    logger.info("Uploading JSON to IPFS via Pinata API", { fileName });
    
    // Convert JSON to buffer
    const jsonString = JSON.stringify(jsonData, null, 2);
    const jsonBuffer = Buffer.from(jsonString, 'utf8');
    
    // Create FormData for multipart upload
    const formData = new FormData();
    const blob = new Blob([jsonBuffer], { type: 'application/json' });
    formData.append('file', blob, fileName);
    formData.append('network', 'public');
    
    // Optional: Add metadata
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        contentType: 'application/json',
        uploadedAt: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Make the API request
    const response = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    logger.info("JSON uploaded to IPFS successfully", { 
      fileName,
      cid: result.data.cid,
      size: result.data.size,
      id: result.data.id
    });
    
    return {
      ipfsHash: result.data.cid,
      pinataId: result.data.id,
      pinSize: result.data.size,
      timestamp: result.data.created_at,
      mimeType: result.data.mime_type,
      isDuplicate: result.data.is_duplicate || false
    };
  } catch (error) {
    logger.error("Failed to upload JSON to IPFS", { 
      fileName, 
      error: error.message 
    });
    throw error;
  }
}

// Calculate score for a chunk based on overlapping periods
function calculateChunkScore(chunkStart, chunkEnd, periods) {
  if (!periods || periods.length === 0) {
    return 0;
  }
  let maxScore = 0;
  for (const period of periods) {
    const overlapStart = Math.max(chunkStart, period.start);
    const overlapEnd = Math.min(chunkEnd, period.end);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    if (overlapDuration > 0) {
      const overlapRatio = overlapDuration / period.duration;
      const weightedScore = period.score * overlapRatio;
      if (weightedScore > maxScore) {
        maxScore = weightedScore;
      }
    }
  }
  return maxScore;
}

// Fetch periods with scores from n8n HTTP API
async function fetchPeriods(link, threshold) {
  try {
    const n8nUrl = `https://n8n.majus.org/webhook/e12ca792-0ff5-46a4-bfc9-b3f89d1f3313?link=${encodeURIComponent(link)}&threshold=${encodeURIComponent(threshold)}`;
    const response = await fetch(n8nUrl);
    if (!response.ok) {
      throw new Error(`n8n API request failed: ${response.status} ${response.statusText}`);
    }
    const { periods } = await response.json();
    return periods;
  } catch (err) {
    logger.error("Failed to fetch periods from n8n API", { error: err.message });
    throw err;
  }
}

// Add new function to get video details from custom API
async function getVideoDetailsFromCustomAPI(link) {
  const url = `https://n8n.majus.org/webhook/25520864-4869-4762-b0e1-6a1c90b0b0c6?link=${encodeURIComponent(link)}`;
  logger.info("Making API request to get video details", { link, url });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Custom API request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  logger.info("Received video details from custom API", { link, hasVideos: !!data.videos });
  return data;
}

// Set token URI for NFT using contract function
async function setTokenURI(nftAddress, tokenId, tokenURI) {
  try {
    logger.info("Setting token URI for NFT", { nftAddress, tokenId, tokenURI });
    
    // Execute the transaction using wallet client
    const hash = await walletClient.writeContract({
      address: nftAddress,
      abi: streamMintNFTAbi,
      functionName: 'setTokenUri',
      args: [tokenId, tokenURI],
      // Increase gas parameters for better reliability
      gas: 1000000n, // Increased gas limit
      maxFeePerGas: 2000000000n, // 2 Gwei
      maxPriorityFeePerGas: 1500000000n, // 1.5 Gwei
    });
    
    logger.info("Token URI transaction submitted", { 
      tokenId, 
      tokenURI,
      transactionHash: hash
    });
    
    // Wait for transaction confirmation
    const receipt = await client.waitForTransactionReceipt({ 
      hash,
      timeout: 120000,
    });
    
    logger.info("Token URI transaction confirmed", { 
      tokenId, 
      tokenURI,
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status
    });
    
    if (receipt.status !== 'success') {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }
    
    return {
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status
    };
  } catch (error) {
    // Enhanced error logging
    logger.error("Failed to set token URI", { 
      tokenId, 
      tokenURI, 
      error: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details || error.data || error.reason
    });
    
    // Add retry logic for specific errors
    if (error.message.includes('insufficient funds') || error.message.includes('gas required exceeds allowance')) {
      throw new Error(`Transaction failed due to gas issues: ${error.message}`);
    }
    
    throw error;
  }
}

export const extractTask = schemaTask({
  id: "extract-task",
  schema: z.object({
    nftAddress: z.string(),
  }),
  run: async (payload, { ctx }) => {
    const { nftAddress } = payload;
    const tempDir = path.join(__dirname, "temp", ctx.run.id);
    const videoPath = path.join(tempDir, "video.mp4");
    logger.info("Starting video extraction task", { payload });
    
    // Read NFT metadata from blockchain
    const nftData = await readNFTMetadata(nftAddress);
    const { videoURL: link, maxSupply: chunks } = nftData;
    
    logger.info("Using NFT metadata for extraction", { link, chunks });
    
    // Make HTTP GET request to n8n endpoint to get periods with scores
    const periods = await fetchPeriods(link, SCORE_THRESHOLD);
    logger.info("Received periods from n8n API", periods);
    await fs.ensureDir(tempDir);
    logger.info("Temporary directory created", { tempDir });
    // Get video details from custom API
    const videoDetails = await getVideoDetailsFromCustomAPI(link);
    if (videoDetails.lengthSeconds > 1800) {
      throw new Error("Video is longer than 30 minutes. Please provide a shorter video.");
    }
    // Select the smallest resolution video stream
    const selectedStream = selectSmallestVideoStream(videoDetails.videos);
    // Download the video
    await downloadVideo(selectedStream.url, videoPath);
    // Get video duration from the API response
    const totalDuration = videoDetails.lengthSeconds;
    const chunkDuration = totalDuration / chunks;
    const items = [];
    const pendingTransactions = [];
    logger.info("Starting JPEG extraction and token metadata processing...", { chunks, chunkDuration });
    
    for (let i = 0; i < chunks; i++) {
      const startTime = i * chunkDuration;
      const endTime = startTime + chunkDuration;
      const outputImagePath = path.join(tempDir, `chunk-${i}.jpg`);
      const outputVideoPath = path.join(tempDir, `chunk-${i}.webm`);
      logger.info(`Processing chunk ${i + 1}/${chunks}`, { startTime, duration: chunkDuration });
      
      try {
        // Extract single JPEG frame
        const ffmpegArgs = [
          "-i", videoPath,
          "-ss", startTime.toFixed(3),
          "-vframes", "1",
          "-q:v", "2",
          "-y",
          outputImagePath,
        ];
        
        await new Promise((resolve, reject) => {
          const process = child_process.spawn('ffmpeg', ffmpegArgs);
          process.on("close", (code) => {
            if (code === 0) {
              logger.info(`Chunk ${i + 1} JPEG extracted successfully`, { outputImagePath });
              resolve();
            } else {
              logger.error(`ffmpeg exited with code ${code} for chunk ${i + 1} JPEG extraction`);
              reject(new Error(`ffmpeg exited with code ${code}`));
            }
          });
          process.on("error", (err) => {
            logger.error(`Failed to start ffmpeg for chunk ${i + 1} JPEG extraction`, { err });
            reject(err);
          });
        });

        // Extract WEBM video segment
        const ffmpegArgsVideo = [
          "-i", videoPath,
          "-ss", startTime.toFixed(3),
          "-t", chunkDuration.toFixed(3),
          // "-c:v", "libvpx",
          // "-crf", "40",
          // "-b:v", "200k",
          "-an",
          "-cpu-used", "8",
          "-deadline", "realtime",
          "-y",
          outputVideoPath,
        ];
        
        await new Promise((resolve, reject) => {
          const process = child_process.spawn('ffmpeg', ffmpegArgsVideo);
          process.on("close", (code) => {
            if (code === 0) {
              logger.info(`Chunk ${i + 1} WEBM extracted successfully`, { outputVideoPath });
              resolve();
            } else {
              logger.error(`ffmpeg exited with code ${code} for chunk ${i + 1} WEBM extraction`);
              reject(new Error(`ffmpeg exited with code ${code}`));
            }
          });
          process.on("error", (err) => {
            logger.error(`Failed to start ffmpeg for chunk ${i + 1} WEBM extraction`, { err });
            reject(err);
          });
        });

        // Upload JPEG to IPFS
        const imageFileName = `chunk-${i}.jpg`;
        const imageIpfsResult = await uploadToIPFS(outputImagePath, imageFileName);
        logger.info(`Chunk ${i + 1} JPEG uploaded to IPFS`, imageIpfsResult);

        // Upload WEBM to IPFS
        const videoFileName = `chunk-${i}.webm`;
        const videoIpfsResult = await uploadToIPFS(outputVideoPath, videoFileName);
        logger.info(`Chunk ${i + 1} WEBM uploaded to IPFS`, videoIpfsResult);

        // Calculate score for this chunk based on period overlaps
        const chunkScore = calculateChunkScore(startTime, endTime, periods);
        
        // Create metadata object for this token
        const metadata = {
          name: `StreamMint Token #${i}`,
          description: "A time-based segment from a StreamMint video with quality score",
          image: `ipfs://${imageIpfsResult.ipfsHash}`,
          animation_url: `ipfs://${videoIpfsResult.ipfsHash}`,
          attributes: [
            {
              trait_type: "Start Time",
              value: startTime.toFixed(3),
              display_type: "number"
            },
            {
              trait_type: "End Time", 
              value: endTime.toFixed(3),
              display_type: "number"
            },
            {
              trait_type: "Duration",
              value: chunkDuration.toFixed(3),
              display_type: "number"
            },
            {
              trait_type: "Quality Score",
              value: chunkScore.toFixed(6),
              display_type: "number"
            }
          ],
          external_url: link,
          background_color: "000000"
        };
        
        // Upload metadata JSON to IPFS
        const jsonFileName = `token-${i}-metadata.json`;
        const jsonUploadResult = await uploadJSONToIPFS(metadata, jsonFileName);
        const tokenURI = `ipfs://${jsonUploadResult.ipfsHash}`;
        
        logger.info(`Token ${i} metadata uploaded to IPFS`, { 
          tokenId: i, 
          metadataHash: jsonUploadResult.ipfsHash,
          tokenURI 
        });
        
        // Start blockchain transaction without awaiting
        const txPromise = setTokenURI(nftAddress, i, tokenURI);
        pendingTransactions.push({
          tokenId: i,
          promise: txPromise
        });
        
        // Add to items array without transaction data for now
        items.push({
          imageHash: imageIpfsResult.ipfsHash,
          videoHash: videoIpfsResult.ipfsHash,
          start: startTime,
          end: endTime,
          score: chunkScore,
          metadataHash: jsonUploadResult.ipfsHash,
          tokenId: i
        });
        
        logger.info(`Chunk ${i + 1} processing completed, blockchain transaction started`, { 
          tokenId: i,
          imageHash: imageIpfsResult.ipfsHash,
          videoHash: videoIpfsResult.ipfsHash,
          metadataHash: jsonUploadResult.ipfsHash,
          tokenURI
        });
        
      } catch (error) {
        logger.error(`Failed to process chunk ${i + 1}`, { 
          error: error.message,
          stack: error.stack
        });
        // Continue processing other chunks even if one fails
      }
    }
    
    logger.info("All chunks processed, waiting for blockchain transactions to complete", { 
      processedChunks: items.length,
      totalChunks: chunks,
      pendingTransactions: pendingTransactions.length
    });

    // Wait for all blockchain transactions to complete
    const transactionResults = await Promise.allSettled(
      pendingTransactions.map(tx => tx.promise)
    );
    
    // Update items with transaction results
    transactionResults.forEach((result, index) => {
      const { tokenId } = pendingTransactions[index];
      const itemIndex = items.findIndex(item => item.tokenId === tokenId);
      
      if (result.status === 'fulfilled') {
        items[itemIndex].txHash = result.value.transactionHash;
        logger.info(`Blockchain transaction completed for token ${tokenId}`, {
          txHash: result.value.transactionHash,
          blockNumber: result.value.blockNumber
        });
      } else {
        logger.error(`Blockchain transaction failed for token ${tokenId}`, {
          error: result.reason?.message || result.reason
        });
        items[itemIndex].txError = result.reason?.message || 'Transaction failed';
      }
    });

    logger.info("All processing completed", { 
      processedChunks: items.length,
      totalChunks: chunks,
      completedTransactions: transactionResults.filter(r => r.status === 'fulfilled').length,
      failedTransactions: transactionResults.filter(r => r.status === 'rejected').length
    });

    return { 
      items,
      videoURL: link,
      maxSupply: chunks
    };
  },
});
