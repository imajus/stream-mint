import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

export const extractTask = schemaTask({
  id: "extract-task",
  schema: z.object({
    link: z.string(),
    threshold: z.number(),
  }),
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: any, { ctx }) => {
    //TODO: Implement the task
  },
});