import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import * as child_process from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables for RapidAPI
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'youtube-media-downloader.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Environment variables for Pinata
const PINATA_JWT = process.env.PINATA_JWT;

if (!RAPIDAPI_KEY) {
  throw new Error('RAPIDAPI_KEY environment variable is required');
}
if (!PINATA_JWT) {
  throw new Error('PINATA_JWT environment variable is required');
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  throw new Error('Invalid YouTube URL or video ID');
}

// Get video details from RapidAPI
async function getVideoDetails(videoId) {
  const url = `https://${RAPIDAPI_HOST}/v2/video/details?videoId=${videoId}&urlAccess=normal&videos=auto&audios=auto`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY
    }
  };
  logger.info("Making API request to get video details", { videoId, url });
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  logger.info("Received video details from API", { videoId, hasVideos: !!data.videos });
  return data;
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
async function downloadVideo(videoUrl, outputPath) {
  logger.info("Downloading video from URL", { videoUrl, outputPath });
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(outputPath, buffer);
  logger.info("Video downloaded successfully", { outputPath, size: buffer.length });
}

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

export const extractTask = schemaTask({
  id: "extract-task",
  schema: z.object({
    link: z.string().url(),
    chunks: z.number().int().min(1),
    threshold: z.number(),
  }),
  run: async (payload, { ctx }) => {
    logger.info("Starting video extraction task", { payload });

    const { link, chunks } = payload;
    const tempDir = path.join(__dirname, "temp", ctx.run.id);
    const videoPath = path.join(tempDir, "video.mp4");

    await fs.ensureDir(tempDir);
    logger.info("Temporary directory created", { tempDir });

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(link);
    logger.info("Extracted video ID", { videoId });

    // Get video details from RapidAPI
    const videoDetails = await getVideoDetails(videoId);
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
    const ipfsUploads = [];

    logger.info("Starting GIF conversion...", { chunks, chunkDuration });

    for (let i = 0; i < chunks; i++) {
      const startTime = i * chunkDuration;
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
        // process.stdout.on("data", (data) => logger.debug(`ffmpeg stdout: ${data}`));
        // process.stderr.on("data", (data) => logger.info(`ffmpeg stderr: ${data}`));
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
        ipfsUploads.push({
          chunkIndex: i,
          fileName,
          localPath: outputGifPath,
          ...ipfsResult
        });
        logger.info(`Chunk ${i + 1} uploaded to IPFS`, ipfsResult);
      } catch (uploadError) {
        logger.error(`Failed to upload chunk ${i + 1} to IPFS`, { 
          error: uploadError.message 
        });
        // Continue processing other chunks even if one upload fails
      }
    }

    logger.info("All chunks converted to GIF successfully", { 
      ipfsUploadsCount: ipfsUploads.length 
    });
    
    return {
      ipfsUploads: ipfsUploads.map(upload => upload.ipfsHash),
    };
  },
});
