import path from "path";
import crypto from "crypto";
import fs from "fs";
import * as db from "./db";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5200";

const DATA_DIR = path.join(process.cwd(), "data");
const VIEW_COUNTS_FILE = path.join(DATA_DIR, "view-counts.json");
const IMAGE_OWNERS_FILE = path.join(DATA_DIR, "image-owners.json");
const VIEW_HISTORY_FILE = path.join(DATA_DIR, "view-history.json");

type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

const loadJSONFile = (filePath: string, defaultValue: JSONValue = {}): JSONValue => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      if (data.trim()) {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error(`Invalid JSON in ${filePath}:`, e);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
};

let migrationPerformed = false;
async function migrateDataIfNeeded() {
  if (migrationPerformed) return;

  try {
    const imageOwners = loadJSONFile(IMAGE_OWNERS_FILE) as Record<string, string>;
    const viewCounts = loadJSONFile(VIEW_COUNTS_FILE) as Record<string, number>;

    const rawViewHistory = loadJSONFile(VIEW_HISTORY_FILE) as Record<string, JSONValue>;
    const viewHistory: Record<string, string[]> = {};

    Object.keys(rawViewHistory).forEach((imageId) => {
      if (Array.isArray(rawViewHistory[imageId])) {
        viewHistory[imageId] = rawViewHistory[imageId] as string[];
      }
    });

    await db.migrateFromJson(imageOwners, viewCounts, viewHistory);
    migrationPerformed = true;

    console.log("Data migrated from JSON files to MongoDB successfully");
  } catch (error) {
    console.error("Failed to migrate data from JSON to MongoDB:", error);
  }
}

if (process.env.NODE_ENV !== "production") {
  migrateDataIfNeeded().catch(console.error);
}

export interface ImageItem {
  url: string;
  id: string;
  size: number;
  uploaded_at: string;
  proxyUrl?: string;
  views?: number;
  sessionId?: string;
}

function hashIpAddress(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";
  return crypto.createHash("sha256").update(`${ip}-${salt}`).digest("hex");
}

const ensureCorrectUrl = (url: string) => {
  if (url.startsWith("http")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  } else {
    return `${API_URL}/${url}`;
  }
};

const createProxyUrl = (imageId: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return `${baseUrl}/api/image/${encodeURIComponent(imageId)}`;
};

export async function getImages(): Promise<ImageItem[]> {
  try {
    const response = await fetch(`${API_URL}/images`, {
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status}`);
    }

    const images = await response.json();

    const transformedImages = await Promise.all(
      Array.isArray(images)
        ? images.map(async (img) => {
            const viewCount = await db.getViewCount(img.id);
            const sessionId = await db.getImageOwner(img.id);

            return {
              ...img,
              url: ensureCorrectUrl(img.url),
              proxyUrl: createProxyUrl(img.id),
              views: viewCount,
              sessionId: sessionId,
            };
          })
        : [],
    );

    return transformedImages.sort((a, b) => (b.views || 0) - (a.views || 0));
  } catch (error) {
    console.error("Failed to fetch images:", error);
    return [];
  }
}

export async function getImageById(imageId: string): Promise<ImageItem | null> {
  try {
    const images = await getImages();
    return images.find((img) => img.id === imageId) || null;
  } catch (error) {
    console.error(`Failed to fetch image with ID ${imageId}:`, error);
    return null;
  }
}

export async function incrementViewCount(
  imageId: string,
  ipAddress: string,
): Promise<{ counted: boolean; count: number }> {
  try {
    const hashedIp = hashIpAddress(ipAddress);
    return await db.incrementViewCount(imageId, hashedIp);
  } catch (error) {
    console.error(`Failed to increment view count for ${imageId}:`, error);
    return { counted: false, count: await getViewCount(imageId) };
  }
}

export function getViewCount(imageId: string): Promise<number> {
  return db.getViewCount(imageId);
}

export function canDeleteImage(
  imageId: string,
  sessionId: string,
): Promise<boolean> {
  return db.canDeleteImage(imageId, sessionId);
}

export async function deleteAllImageData(imageId: string): Promise<void> {
  await db.deleteAllImageData(imageId);
}

export async function setImageOwner(
  imageId: string,
  sessionId: string,
  ipAddress: string,
): Promise<void> {
  await db.setImageOwner(imageId, sessionId, ipAddress);
  console.log(`Set owner for image ${imageId} to session ${sessionId}`);
}

export async function getUserImages(sessionId: string): Promise<string[]> {
  return db.getUserImages(sessionId);
}
