export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Step 1: Get signature from API
  const signatureResponse = await fetch("/api/cloudinary/signature");
  if (!signatureResponse.ok) {
    throw new Error("Failed to get upload signature");
  }

  const { data } = await signatureResponse.json();
  const { signature, cloudName, timestamp, folder, apiKey } = data;

  // Step 2: Determine resource type (image or video)
  const isVideo = file.type.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";

  // Step 3: Create FormData for upload
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);

  // Step 4: Upload with progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100),
        };
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url || response.url,
            publicId: response.public_id,
            secureUrl: response.secure_url || response.url,
          });
        } catch (error) {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    // Start upload
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
    );
    xhr.send(formData);
  });
}
