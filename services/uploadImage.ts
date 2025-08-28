import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

export async function uploadImageAsync(
  localUri: string,
  userId: string,
  bucket: string = 'climbing-images'
): Promise<string> {
  // ext
  const fileExt = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  
  // Generate more unique filename with timestamp + random string
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomString}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  console.log('📤 [uploadImageAsync] Uploading to path:', filePath);

  // Read file as base64 then convert to ArrayBuffer (required by supabase-js in RN)
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = Uint8Array.from(Buffer.from(base64, 'base64'));

  const { error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
    contentType: `image/${fileExt}`,
    upsert: true, // Allow overwriting existing files
  });

  if (error) {
    console.error('❌ [uploadImageAsync] Upload error:', error);
    throw error;
  }

  console.log('✅ [uploadImageAsync] Successfully uploaded:', filePath);
  return filePath;
}

export async function uploadMultipleImagesAsync(
  localUris: string[],
  userId: string,
  bucket: string = 'climbing-images'
): Promise<string[]> {
  if (!localUris || localUris.length === 0) {
    return [];
  }

  console.log('📤 [uploadMultipleImagesAsync] Starting upload of', localUris.length, 'images');
  console.log('📤 [uploadMultipleImagesAsync] URIs:', localUris.map(uri => uri.substring(0, 50) + '...'));

  const uploadPromises = localUris.map(async (uri, index) => {
    try {
      console.log(`📤 [uploadMultipleImagesAsync] Uploading image ${index + 1}/${localUris.length}:`, uri.substring(0, 50) + '...');
      const result = await uploadImageAsync(uri, userId, bucket);
      console.log(`✅ [uploadMultipleImagesAsync] Image ${index + 1} uploaded successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ [uploadMultipleImagesAsync] Error uploading image ${index + 1} (${uri}):`, error);
      throw error;
    }
  });

  try {
    const imagePaths = await Promise.all(uploadPromises);
    console.log('✅ [uploadMultipleImagesAsync] All images uploaded successfully:', imagePaths);
    return imagePaths;
  } catch (error) {
    console.error('❌ [uploadMultipleImagesAsync] Error in batch upload:', error);
    throw error;
  }
} 