import { z } from "zod";

const downloadSchema = z.object({
  url: z.string().url("Cole um link válido, começando com https://."),
  format: z.enum(["video", "audio"]),
  quality: z.enum(["4k", "1080p", "720p", "mp3"]).optional(),
});

export type DownloadFormValues = z.infer<typeof downloadSchema>;

export default downloadSchema;
