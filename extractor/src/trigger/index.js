import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import * as child_process from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from "util";
import { Curl } from 'node-libcurl';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables for Pinata
const PINATA_JWT = process.env.PINATA_JWT;

const CURL_TIMEOUT = process.env.CURL_TIMEOUT ?? 3 * 60 * 60;

if (!PINATA_JWT) {
  throw new Error('PINATA_JWT environment variable is required');
}

// Select the smallest resolution video stream
function selectSmallestVideoStream(videoStreams) {
  if (!videoStreams || videoStreams.items.length === 0) {
    throw new Error('No video streams available');
  }
  // Sort by quality (height) ascending to get the smallest
  const sortedStreams = videoStreams.items
    .filter(stream => stream.extension === 'mp4')
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
    
    // Create FormData for multipart upload
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'image/gif' });
    formData.append('file', blob, fileName);
    formData.append('network', 'public');
    
    // Optional: Add metadata
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        originalPath: filePath,
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
    logger.info("File uploaded to IPFS successfully", { 
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
    logger.error("Failed to upload file to IPFS", { 
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

export const extractTask = schemaTask({
  id: "extract-task",
  schema: z.object({
    link: z.string().url(),
    chunks: z.number().int().min(1),
    threshold: z.number(),
  }),
  run: async (payload, { ctx }) => {
    const { link, chunks, threshold } = payload;
    const tempDir = path.join(__dirname, "temp", ctx.run.id);
    const videoPath = path.join(tempDir, "video.mp4");
    logger.info("Starting video extraction task", { payload });
    // Make HTTP GET request to n8n endpoint to get periods with scores
    const periods = await fetchPeriods(link, threshold);
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
    logger.info("Starting GIF conversion...", { chunks, chunkDuration });
    for (let i = 0; i < chunks; i++) {
      const startTime = i * chunkDuration;
      const endTime = startTime + chunkDuration;
      const outputGifPath = path.join(tempDir, `chunk-${i}.gif`);
      logger.info(`Processing chunk ${i + 1}/${chunks}`, { startTime, duration: chunkDuration });
      const ffmpegArgs = [
        "-i", videoPath,
        "-ss", startTime.toFixed(3),
        "-t", chunkDuration.toFixed(3),
        "-vf", "fps=5,scale=320:-1:flags=fast_bilinear",
        "-y",
        outputGifPath,
      ];
      await new Promise((resolve, reject) => {
        const process = child_process.spawn('ffmpeg', ffmpegArgs);
        process.on("close", (code) => {
          if (code === 0) {
            logger.info(`Chunk ${i + 1} converted to GIF successfully`, { outputGifPath });
            resolve();
          } else {
            logger.error(`ffmpeg exited with code ${code} for chunk ${i + 1}`);
            reject(new Error(`ffmpeg exited with code ${code}`));
          }
        });
        process.on("error", (err) => {
          logger.error(`Failed to start ffmpeg for chunk ${i + 1}`, { err });
          reject(err);
        });
      });
      // Upload the GIF to IPFS
      try {
        const fileName = `chunk-${i}.gif`;
        const ipfsResult = await uploadToIPFS(outputGifPath, fileName);
        logger.info(`Chunk ${i + 1} uploaded to IPFS`, ipfsResult);
        // Calculate score for this chunk based on period overlaps
        const chunkScore = calculateChunkScore(startTime, endTime, periods);
        items.push({
          hash: ipfsResult.ipfsHash,
          start: startTime,
          end: endTime,
          score: chunkScore
        });
      } catch (uploadError) {
        logger.error(`Failed to upload chunk ${i + 1} to IPFS`, { 
          error: uploadError.message 
        });
        // Continue processing other chunks even if one upload fails
      }
    }
    logger.info("All chunks converted to GIF successfully", { 
      ipfsUploadsCount: items.length 
    });
    return { items };
  },
});
