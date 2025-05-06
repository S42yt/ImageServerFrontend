import fs from "fs";
import path from "path";
import crypto from "crypto";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5200";

const DATA_DIR = path.join(process.cwd(), "data");
const VIEW_COUNTS_FILE = path.join(DATA_DIR, "view-counts.json");
const IMAGE_OWNERS_FILE = path.join(DATA_DIR, "image-owners.json");
const VIEW_HISTORY_FILE = path.join(DATA_DIR, "view-history.json");

function ensureDataDirectoryExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o755 });
      console.log(`Created data directory at ${DATA_DIR}`);
    }
    
    try {
      const testFile = path.join(DATA_DIR, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (err) {
      console.error(`Data directory exists but is not writable: ${DATA_DIR}`, err);
      try {
        fs.chmodSync(DATA_DIR, 0o755);
        console.log(`Updated permissions for data directory at ${DATA_DIR}`);
      } catch (permError) {
        console.error(`Failed to update permissions: ${permError}`);
      }
    }
  } catch (error) {
    console.error(`Critical error with data directory at ${DATA_DIR}:`, error);
  }
}

const ensureFileExists = (filePath: string, defaultContent: string = "{}") => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultContent, { mode: 0o644 });
      console.log(`Created file at ${filePath}`);
    } else {
      try {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim() || (defaultContent === "{}" && !isValidJson(content))) {
          fs.writeFileSync(filePath, defaultContent, { mode: 0o644 });
          console.log(`Reset file at ${filePath} with default content`);
        }
      } catch (err) {
        console.error(`File exists but has issues: ${filePath}`, err);
        try {
          fs.chmodSync(filePath, 0o644);
        } catch (permError) {
          console.error(`Failed to update file permissions: ${permError}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to create/verify file at ${filePath}:`, error);
  }
};

function isValidJson(str: string) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

ensureDataDirectoryExists();
ensureFileExists(VIEW_COUNTS_FILE);
ensureFileExists(IMAGE_OWNERS_FILE);
ensureFileExists(VIEW_HISTORY_FILE);

export interface ImageItem {
  url: string;
  id: string;
  size: number;
  uploaded_at: string;
  proxyUrl?: string;
  views?: number;
  sessionId?: string;
}

function loadViewCounts(): Record<string, number> {
  try {
    if (fs.existsSync(VIEW_COUNTS_FILE)) {
      const data = fs.readFileSync(VIEW_COUNTS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading view counts:", error);
  }
  return {};
}

function saveViewCounts(viewCounts: Record<string, number>) {
  try {
    fs.writeFileSync(VIEW_COUNTS_FILE, JSON.stringify(viewCounts, null, 2));
  } catch (error) {
    console.error("Error saving view counts:", error);
  }
}

function loadImageOwners(): Record<string, string> {
  try {
    if (fs.existsSync(IMAGE_OWNERS_FILE)) {
      const data = fs.readFileSync(IMAGE_OWNERS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading image owners:", error);
  }
  return {};
}

function saveImageOwners(imageOwners: Record<string, string>) {
  try {
    fs.writeFileSync(IMAGE_OWNERS_FILE, JSON.stringify(imageOwners, null, 2));
  } catch (error) {
    console.error("Error saving image owners:", error);
  }
}

function loadViewHistory(): Record<string, Set<string>> {
  try {
    if (fs.existsSync(VIEW_HISTORY_FILE)) {
      const data = fs.readFileSync(VIEW_HISTORY_FILE, "utf8");
      const parsedData = JSON.parse(data);

      const result: Record<string, Set<string>> = {};
      Object.keys(parsedData).forEach((imageId) => {
        result[imageId] = new Set(parsedData[imageId]);
      });

      return result;
    }
  } catch (error) {
    console.error("Error loading view history:", error);
  }
  return {};
}

function saveViewHistory(viewHistory: Record<string, Set<string>>) {
  try {
    const serializableData: Record<string, string[]> = {};
    Object.keys(viewHistory).forEach((imageId) => {
      serializableData[imageId] = Array.from(viewHistory[imageId]);
    });

    fs.writeFileSync(
      VIEW_HISTORY_FILE,
      JSON.stringify(serializableData, null, 2),
    );
  } catch (error) {
    console.error("Error saving view history:", error);
  }
}

const viewCounts: Record<string, number> = loadViewCounts();
const viewedIpsByImage: Record<string, Set<string>> = loadViewHistory();
const imageOwners: Record<string, string> = loadImageOwners();

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

function hashIpAddress(ip: string): string {
  const salt = new Date().toISOString().split("T")[0];
  return crypto.createHash("sha256").update(`${ip}-${salt}`).digest("hex");
}

export async function getImages(): Promise<ImageItem[]> {
  try {
    const response = await fetch(`${API_URL}/images`, {
      next: { revalidate: 10 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status}`);
    }

    const images = await response.json();

    const transformedImages = Array.isArray(images)
      ? images.map((img) => ({
          ...img,
          url: ensureCorrectUrl(img.url),
          proxyUrl: createProxyUrl(img.id),
          views: viewCounts[img.id] || 0,
          sessionId: imageOwners[img.id] || null,
        }))
      : [];

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

    if (!viewedIpsByImage[imageId]) {
      viewedIpsByImage[imageId] = new Set();
    }
    if (viewCounts[imageId] === undefined) {
      viewCounts[imageId] = 0;
    }

    if (viewedIpsByImage[imageId].has(hashedIp)) {
      return {
        counted: false,
        count: viewCounts[imageId],
      };
    }

    viewedIpsByImage[imageId].add(hashedIp);

    viewCounts[imageId] += 1;

    saveViewCounts(viewCounts);
    saveViewHistory(viewedIpsByImage);

    console.log(
      `Incremented view count for ${imageId} to ${viewCounts[imageId]}`,
    );

    return {
      counted: true,
      count: viewCounts[imageId],
    };
  } catch (error) {
    console.error(`Failed to increment view count for ${imageId}:`, error);
    throw error;
  }
}

export function getViewCount(imageId: string): number {
  return viewCounts[imageId] || 0;
}

export function canDeleteImage(imageId: string, sessionId: string): boolean {
  return imageOwners[imageId] === sessionId;
}

export function setImageOwner(imageId: string, sessionId: string): void {
  imageOwners[imageId] = sessionId;
  saveImageOwners(imageOwners);
  console.log(`Set owner for image ${imageId} to session ${sessionId}`);
}
