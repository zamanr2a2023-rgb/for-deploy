/** @format */

import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

const IMAGE_UPLOAD_SERVICE_URL =
  process.env.IMAGE_UPLOAD_SERVICE_URL || "https://img.mtscorporate.com";

/**
 * Upload image to external image service
 * @param {Object} file - Multer file object
 * @returns {Promise<string>} - Image URL from the service
 */
export const uploadImageToService = async (file) => {
  try {
    const formData = new FormData();

    // Read the file from disk (multer saves it temporarily)
    const fileStream = fs.createReadStream(file.path);
    formData.append("image", fileStream, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await fetch(`${IMAGE_UPLOAD_SERVICE_URL}/upload-single`, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Image upload failed: ${response.status}`
      );
    }

    const result = await response.json();

    // Clean up temp file
    fs.unlink(file.path, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });

    // Return the image URL from the service (format: { file: { url: "..." } })
    return result.file?.url || result.url || result.imageUrl;
  } catch (error) {
    console.error("Image upload error:", error);

    // Clean up temp file on error
    if (file.path) {
      fs.unlink(file.path, () => {});
    }

    throw error;
  }
};

export default uploadImageToService;
