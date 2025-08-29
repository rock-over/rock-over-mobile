import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

const CACHE_DIR = FileSystem.documentDirectory + 'profile_images/';
const CACHE_METADATA_KEY = 'profile_image_cache_metadata';

interface CacheMetadata {
  [userId: string]: {
    localPath: string;
    supabaseUrl: string;
    cachedAt: number;
    fileSize: number;
  };
}

export const imageCacheService = {
  // Inicializar o diretório de cache
  async initializeCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        console.log('📁 [ImageCache] Cache directory created:', CACHE_DIR);
      }
    } catch (error) {
      console.error('❌ [ImageCache] Error initializing cache:', error);
    }
  },

  // Gerar nome único para o arquivo baseado no userId
  getCacheFileName(userId: string): string {
    return `profile_${userId}.jpg`;
  },

  // Obter caminho local do cache
  getLocalCachePath(userId: string): string {
    return CACHE_DIR + this.getCacheFileName(userId);
  },

  // Verificar se imagem existe no cache local
  async isImageCached(userId: string): Promise<boolean> {
    try {
      const localPath = this.getLocalCachePath(userId);
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      console.error('❌ [ImageCache] Error checking cache:', error);
      return false;
    }
  },

  // Obter metadados do cache
  async getCacheMetadata(): Promise<CacheMetadata> {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      return metadata ? JSON.parse(metadata) : {};
    } catch (error) {
      console.error('❌ [ImageCache] Error reading metadata:', error);
      return {};
    }
  },

  // Salvar metadados do cache
  async saveCacheMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('❌ [ImageCache] Error saving metadata:', error);
    }
  },

  // Baixar e cachear imagem do Supabase
  async downloadAndCacheImage(userId: string, supabaseUrl: string): Promise<string | null> {
    try {
      console.log('⬇️ [ImageCache] === STARTING DOWNLOAD ===');
      console.log('📥 [ImageCache] URL to download:', supabaseUrl);
      
      await this.initializeCache();
      
      const localPath = this.getLocalCachePath(userId);
      console.log('📁 [ImageCache] Target local path:', localPath);
      
      // Baixar a imagem
      console.log('🌐 [ImageCache] Starting FileSystem.downloadAsync...');
      const downloadResult = await FileSystem.downloadAsync(supabaseUrl, localPath);
      
      console.log('📊 [ImageCache] Download result status:', downloadResult.status);
      console.log('📊 [ImageCache] Download result headers:', downloadResult.headers);
      
      if (downloadResult.status === 200) {
        console.log('✅ [ImageCache] Download status OK (200)');
        
        // Obter informações do arquivo baixado
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        console.log('📄 [ImageCache] File info:', fileInfo);
        
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 100) {
          console.log('✅ [ImageCache] File exists locally, size:', fileInfo.size);
          
          // Validar se parece ser um arquivo de imagem válido
          try {
            // Tentar ler os primeiros bytes para verificar formato
            const base64Sample = await FileSystem.readAsStringAsync(localPath, {
              encoding: FileSystem.EncodingType.Base64,
              length: 20 // Apenas primeiros 20 bytes
            });
            
            if (base64Sample && base64Sample.length > 0) {
              console.log('✅ [ImageCache] File seems to be a valid image');
              
              // Atualizar metadados
              const metadata = await this.getCacheMetadata();
              metadata[userId] = {
                localPath,
                supabaseUrl,
                cachedAt: Date.now(),
                fileSize: fileInfo.size || 0
              };
              await this.saveCacheMetadata(metadata);
              
              console.log('✅ [ImageCache] DOWNLOAD SUCCESS! Image cached at:', localPath);
              return localPath;
            } else {
              console.log('❌ [ImageCache] Downloaded file appears to be corrupted');
            }
          } catch (validateError) {
            console.log('❌ [ImageCache] Error validating downloaded file:', validateError);
          }
        } else {
          console.log('❌ [ImageCache] File does not exist or is too small after download!');
        }
      } else {
        console.log('❌ [ImageCache] DOWNLOAD FAILED! HTTP Status:', downloadResult.status);
        
        // Log adicional para status 400
        if (downloadResult.status === 400) {
          console.log('🔍 [ImageCache] Status 400: Bad Request - URL may be invalid or expired');
          console.log('🔍 [ImageCache] Full URL being accessed:', supabaseUrl);
        }
      }
      
      return null;
    } catch (error) {
      console.error('💥 [ImageCache] DOWNLOAD ERROR:', error);
      console.error('💥 [ImageCache] Error details:', JSON.stringify(error, null, 2));
      return null;
    }
  },

  // Obter imagem de perfil com cache e fallback
  async getProfileImage(userId: string): Promise<{ source: any; isCached: boolean }> {
    try {
      console.log('🖼️ [ImageCache] === STARTING getProfileImage for user:', userId);
      
      // 1. Verificar se existe cache local
      console.log('🔍 [ImageCache] STEP 1: Checking local cache...');
      const isImageCached = await this.isImageCached(userId);
      
      if (isImageCached) {
        const localPath = this.getLocalCachePath(userId);
        console.log('✅ [ImageCache] CACHE HIT! Using cached image:', localPath);
        
        // Verificar se o arquivo realmente existe e tem conteúdo
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        console.log('📄 [ImageCache] Cached file info:', fileInfo);
        
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
          console.log('✅ [ImageCache] File exists and has content (size:', fileInfo.size, 'bytes)');
          
          // Verificar se é um arquivo de imagem válido pelo tamanho mínimo
          if (fileInfo.size < 100) {
            console.log('❌ [ImageCache] File too small, probably corrupted. Clearing cache...');
            await this.clearUserCache(userId);
            console.log('🔄 [ImageCache] Cache cleared, falling back to download...');
          } else {
            console.log('📱 [ImageCache] Returning CACHED image source');
            return { source: { uri: localPath }, isCached: true };
          }
        } else {
          console.log('❌ [ImageCache] Cached file is missing or empty! Clearing cache...');
          await this.clearUserCache(userId);
          console.log('🔄 [ImageCache] Cache cleared, falling back to download...');
        }
      }
      
      console.log('❌ [ImageCache] CACHE MISS! No local cache found');
      
      // 2. Buscar URL do Supabase na tabela profiles
      console.log('🔍 [ImageCache] STEP 2: Fetching profile from Supabase database...');
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ [ImageCache] DATABASE ERROR:', error);
        console.log('🎨 [ImageCache] STEP 3: Using FALLBACK due to database error');
        return this.getFallbackImage();
      }
      
      console.log('✅ [ImageCache] Database query successful. Profile data:', profile);
      
      // 3. Se tem URL no Supabase, tentar cachear e usar
      if (profile?.profile_picture_url) {
        console.log('🌐 [ImageCache] STEP 3: Found profile picture URL:', profile.profile_picture_url);
        
        // Primeiro, verificar se o arquivo existe no storage
        console.log('🔍 [ImageCache] Checking if file exists in Supabase storage...');
        const fileExists = await this.checkFileExistsInStorage(userId, profile.profile_picture_url);
        
        if (!fileExists) {
          console.log('❌ [ImageCache] File does not exist in Supabase storage!');
          console.log('🧹 [ImageCache] Cleaning up invalid URL from database...');
          
          // Limpar URL inválida do banco de dados
          await supabase
            .from('profiles')
            .update({ profile_picture_url: null })
            .eq('id', userId);
            
          console.log('🎨 [ImageCache] Using fallback due to missing file');
          return this.getFallbackImage();
        }
        
        console.log('✅ [ImageCache] File exists in storage, proceeding with download...');
        console.log('⬇️ [ImageCache] Attempting to download and cache...');
        
        const cachedPath = await this.downloadAndCacheImage(userId, profile.profile_picture_url);
        
        if (cachedPath) {
          console.log('✅ [ImageCache] DOWNLOAD SUCCESS! Cached at:', cachedPath);
          console.log('📱 [ImageCache] Returning NEWLY CACHED image source');
          return { source: { uri: cachedPath }, isCached: true };
        }
        
        // Se falhou o download mas arquivo existe, tentar signed URL e cachear
        console.log('⚠️ [ImageCache] Download failed, trying signed URL...');
        const signedUrl = await this.getSignedUrl(profile.profile_picture_url);
        
        if (signedUrl) {
          console.log('🔐 [ImageCache] Using signed URL:', signedUrl);
          
          // Tentar cachear via signed URL
          console.log('💾 [ImageCache] Attempting to cache via signed URL...');
          const cachedViaSigned = await this.downloadAndCacheImage(userId, signedUrl);
          
          if (cachedViaSigned) {
            console.log('✅ [ImageCache] Successfully cached via signed URL!');
            return { source: { uri: cachedViaSigned }, isCached: true };
          } else {
            console.log('⚠️ [ImageCache] Cache via signed URL failed, using direct signed URL');
            return { source: { uri: signedUrl }, isCached: false };
          }
        }
        
        console.log('❌ [ImageCache] All URL attempts failed');
        return this.getFallbackImage();
      }
      
      // 4. Sem URL no Supabase, usar fallback
      console.log('❌ [ImageCache] No profile_picture_url found in database');
      console.log('🎨 [ImageCache] STEP 4: Using DEFAULT ILLUSTRATION fallback');
      return this.getFallbackImage();
      
    } catch (error) {
      console.error('💥 [ImageCache] UNEXPECTED ERROR in getProfileImage:', error);
      console.log('🎨 [ImageCache] EMERGENCY FALLBACK: Using default illustration');
      return this.getFallbackImage();
    }
  },

  // Obter imagem de fallback (ilustração padrão)
  getFallbackImage(): { source: any; isCached: boolean } {
    console.log('🎨 [ImageCache] === FALLBACK ACTIVATED ===');
    
    const illustrations = [
      require('../assets/images/profile-illustrations/profile_illustration_1.png'),
      require('../assets/images/profile-illustrations/profile_illustration_2.png'),
      require('../assets/images/profile-illustrations/profile_illustration_3.png'),
      require('../assets/images/profile-illustrations/profile_illustration_4.png'),
      require('../assets/images/profile-illustrations/profile_illustration_5.png'),
      require('../assets/images/profile-illustrations/profile_illustration_6.png'),
      require('../assets/images/profile-illustrations/profile_illustration_7.png'),
      require('../assets/images/profile-illustrations/profile_illustration_8.png'),
      require('../assets/images/profile-illustrations/profile_illustration_9.png'),
    ];
    
    // Usar primeira ilustração como padrão
    const defaultIllustration = illustrations[0];
    console.log('✅ [ImageCache] FALLBACK: Using default illustration_1');
    console.log('📱 [ImageCache] FALLBACK: Illustration source type:', typeof defaultIllustration);
    
    return { source: defaultIllustration, isCached: true };
  },

  // Limpar cache de um usuário específico
  async clearUserCache(userId: string): Promise<void> {
    try {
      const localPath = this.getLocalCachePath(userId);
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);
        console.log('🗑️ [ImageCache] Cleared cache for user:', userId);
        
        // Remover dos metadados
        const metadata = await this.getCacheMetadata();
        delete metadata[userId];
        await this.saveCacheMetadata(metadata);
      }
    } catch (error) {
      console.error('❌ [ImageCache] Error clearing cache:', error);
    }
  },

  // Limpar todo o cache
  async clearAllCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIR);
        await AsyncStorage.removeItem(CACHE_METADATA_KEY);
        console.log('🗑️ [ImageCache] Cleared all cache');
      }
    } catch (error) {
      console.error('❌ [ImageCache] Error clearing all cache:', error);
    }
  },

  // Obter estatísticas do cache
  async getCacheStats(): Promise<{ totalFiles: number; totalSize: number }> {
    try {
      const metadata = await this.getCacheMetadata();
      const userIds = Object.keys(metadata);
      
      let totalSize = 0;
      let validFiles = 0;
      
      for (const userId of userIds) {
        const fileInfo = await FileSystem.getInfoAsync(metadata[userId].localPath);
        if (fileInfo.exists) {
          validFiles++;
          totalSize += fileInfo.size || 0;
        }
      }
      
      return { totalFiles: validFiles, totalSize };
    } catch (error) {
      console.error('❌ [ImageCache] Error getting cache stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  },

  // Verificar se arquivo existe no storage do Supabase
  async checkFileExistsInStorage(userId: string, fileUrl: string): Promise<boolean> {
    try {
      console.log('🔍 [ImageCache] Checking file existence...');
      
      // Extrair o path do arquivo da URL
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'profile-pics');
      
      if (bucketIndex === -1) {
        console.log('❌ [ImageCache] Invalid URL format - no bucket found');
        return false;
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      console.log('📁 [ImageCache] File path in bucket:', filePath);
      
      // Usar Supabase Storage API para verificar se existe
      const { data, error } = await supabase.storage
        .from('profile-pics')
        .list(userId, {
          limit: 100,
          offset: 0
        });
      
      if (error) {
        console.error('❌ [ImageCache] Error checking storage:', error);
        return false;
      }
      
      const fileName = filePath.split('/').pop();
      const fileExists = data?.some(file => file.name === fileName) ?? false;
      
      console.log('📋 [ImageCache] Files in bucket:', data?.map(f => f.name));
      console.log('🔍 [ImageCache] Looking for file:', fileName);
      console.log('✅ [ImageCache] File exists:', fileExists);
      
      return fileExists;
    } catch (error) {
      console.error('❌ [ImageCache] Error checking file existence:', error);
      return false;
    }
  },

  // Obter signed URL para acesso privado
  async getSignedUrl(originalUrl: string): Promise<string | null> {
    try {
      console.log('🔐 [ImageCache] Generating signed URL...');
      
      // Extrair path do arquivo da URL original
      const urlParts = originalUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'profile-pics');
      
      if (bucketIndex === -1) {
        return null;
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      console.log('📁 [ImageCache] File path for signed URL:', filePath);
      
      const { data, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(filePath, 3600); // 1 hora de validade
      
      if (error) {
        console.error('❌ [ImageCache] Error creating signed URL:', error);
        return null;
      }
      
      console.log('✅ [ImageCache] Signed URL created successfully');
      return data.signedUrl;
    } catch (error) {
      console.error('❌ [ImageCache] Error generating signed URL:', error);
      return null;
    }
  },

  // Invalidar cache quando imagem for atualizada
  async invalidateUserCache(userId: string): Promise<void> {
    console.log('🔄 [ImageCache] Invalidating cache for user:', userId);
    await this.clearUserCache(userId);
  }
};
