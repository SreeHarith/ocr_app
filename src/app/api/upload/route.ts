import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // Convert the file to a buffer
  const buffer = await file.arrayBuffer();
  const bytes = Buffer.from(buffer);

  try {
    // Upload the image to Cloudinary. We're using a Promise to handle the stream.
    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ocr-uploads',
          // This transformation creates the JPG version on Cloudinary's servers.
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { format: 'jpg', quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(bytes);
    });

    // ================== THE FIX IS HERE ==================
    // The result.secure_url points to the original .heic file.
    // We manually change the extension to .jpg to get the URL for the converted version.
    const transformedUrl = result.secure_url.replace(/\.heic$/i, ".jpg");
    // =====================================================

    // Return the secure URL of the newly converted and optimized JPG image
    return NextResponse.json({ url: transformedUrl });

  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Failed to upload image to Cloudinary." }, { status: 500 });
  }
}
