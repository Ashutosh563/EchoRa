import { z } from "zod";
import { AppError } from "../utils/AppError.js";
import type { Request, Response, NextFunction } from "express";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB max base64 payload
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const cameraImageSchema = z.object({
  image: z
    .string()
    .min(10, "Image payload is empty or invalid.")
    .refine((val) => val.length <= MAX_IMAGE_BYTES, {
      message: "Image payload exceeds maximum allowed size (4MB).",
    }),
  mimeType: z
    .string()
    .optional()
    .default("image/jpeg")
    .refine((val) => ALLOWED_MIME_TYPES.includes(val.toLowerCase()), {
      message: "Invalid image MIME type. Supported types: image/jpeg, image/png, image/webp.",
    }),
});

export type ValidatedCameraImage = z.infer<typeof cameraImageSchema>;

/** Validates incoming base64 image frame */
export function validateImagePayload(req: Request, _res: Response, next: NextFunction): void {
  const result = cameraImageSchema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.issues[0]?.message || "Invalid image payload.";
    next(new AppError("VALIDATION_ERROR", { message: msg }));
    return;
  }
  req.body = result.data;
  next();
}
