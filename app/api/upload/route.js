import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    // Allow uploads during registration (no auth required)
    // Authentication is optional for profile picture uploads
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine resource type based on file type
    const fileType = file.type;
    let resourceType = 'image';
    if (fileType === 'application/pdf') {
      resourceType = 'raw'; // PDFs are uploaded as raw files in Cloudinary
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      if (resourceType === 'raw') {
        // For PDFs, use upload_stream with raw resource type
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: 'raw',
              folder: 'patient-assist',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      } else {
        // For images, use image resource type
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: 'image',
              folder: 'patient-assist',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      }
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: 'Cloudinary is not configured. Please check your environment variables.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Upload failed. Please check your Cloudinary configuration.' },
      { status: 500 }
    );
  }
}

