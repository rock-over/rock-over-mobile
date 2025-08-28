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
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Read file as base64 then convert to ArrayBuffer (required by supabase-js in RN)
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = Uint8Array.from(Buffer.from(base64, 'base64'));

  const { error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
    contentType: `image/${fileExt}`,
    upsert: false,
  });

  if (error) {
    console.error('uploadImageAsync error:', error);
    throw error;
  }

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

  const uploadPromises = localUris.map(async (uri) => {
    try {
      return await uploadImageAsync(uri, userId, bucket);
    } catch (error) {
      console.error(`Error uploading image ${uri}:`, error);
      throw error;
    }
  });

  try {
    const imagePaths = await Promise.all(uploadPromises);
    return imagePaths;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
} 