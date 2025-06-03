import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_xotvdgoryopijtmxztup",
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  dirs: ["./src/trigger"],
  build: {
    extensions: [ffmpeg()],
  },
});
