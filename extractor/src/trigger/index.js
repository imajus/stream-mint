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

if (!RAPIDAPI_KEY) {
  throw new Error('RAPIDAPI_KEY environment variable is required');
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

export const extractTask = schemaTask({
  id: "extract-task",
  schema: z.object({
    link: z.string().url(),
    chunks: z.number().int().min(1),
    threshold: z.number(),
  }),
  maxDuration: 300,
  run: async (payload, { ctx }) => {
    logger.info("Starting video extraction task", { payload });

    const { link, chunks } = payload;
    const tempDir = path.join(__dirname, "temp", ctx.run.id);
    const videoPath = path.join(tempDir, "video.mp4");

    try {
      await fs.ensureDir(tempDir);
      logger.info("Temporary directory created", { tempDir });

      // Extract video ID from YouTube URL
      const videoId = extractVideoId(link);
      logger.info("Extracted video ID", { videoId });

      // Get video details from RapidAPI
      const videoDetails = await getVideoDetails(videoId);
      
      // Select the smallest resolution video stream
      const selectedStream = selectSmallestVideoStream(videoDetails.videos);
      
      // Download the video
      await downloadVideo(selectedStream.url, videoPath);

      // Get video duration from the API response
      const totalDuration = selectedStream.lengthMs / 1000;
      const chunkDuration = totalDuration / chunks;
      const gifPaths = [];

      logger.info("Starting GIF conversion...", { chunks, chunkDuration });

      for (let i = 0; i < chunks; i++) {
        const startTime = i * chunkDuration;
        const outputGifPath = path.join(tempDir, `chunk-${i}.gif`);
        
        logger.info(`Processing chunk ${i + 1}/${chunks}`, { startTime, duration: chunkDuration });

        const ffmpegArgs = [
          "-i", videoPath,
          "-ss", startTime.toFixed(3),
          "-t", chunkDuration.toFixed(3),
          "-vf", "fps=10,scale=320:-1:flags=lanczos",
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
              gifPaths.push(outputGifPath);
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
      }

      logger.info("All chunks converted to GIF successfully", { gifPaths });
      return {
        message: "Video processed successfully. GIFs created.",
        gifPaths,
        tempDirUsed: tempDir
      };

    } catch (error) {
      logger.error("Error in video extraction task", { error: error.message, stack: error.stack });
      throw error;
    }
  },
});
