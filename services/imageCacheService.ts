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
      
      await this.initializeCache();
      
      const localPath = this.getLocalCachePath(userId);
      
      // Baixar a imagem
      const downloadResult = await FileSystem.downloadAsync(supabaseUrl, localPath);
      
      if (downloadResult.status === 200) {
        // Obter informações do arquivo baixado
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 100) {
          
          // Validar se parece ser um arquivo de imagem válido
          try {
            // Tentar ler os primeiros bytes para verificar formato
            const base64Sample = await FileSystem.readAsStringAsync(localPath, {
              encoding: FileSystem.EncodingType.Base64,
              length: 20 // Apenas primeiros 20 bytes
            });
            
            if (base64Sample && base64Sample.length > 0) {
              
              // Atualizar metadados
              const metadata = await this.getCacheMetadata();
              metadata[userId] = {
                localPath,
                supabaseUrl,
                cachedAt: Date.now(),
                fileSize: fileInfo.size || 0
              };
              await this.saveCacheMetadata(metadata);
              
              return localPath;
            }
          } catch (validateError) {
            // Validation error - file might be corrupted
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Download error:', error);
      return null;
    }
  },

  // Obter imagem de perfil com cache e fallback
  async getProfileImage(userId: string): Promise<{ source: any; isCached: boolean }> {
    try {
      
      // 1. Verificar se existe cache local
      const isImageCached = await this.isImageCached(userId);
      
      if (isImageCached) {
        const localPath = this.getLocalCachePath(userId);
        
        // Verificar se o arquivo realmente existe e tem conteúdo
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
          
          // Verificar se é um arquivo de imagem válido pelo tamanho mínimo
          if (fileInfo.size < 100) {
            await this.clearUserCache(userId);
          } else {
            return { source: { uri: localPath }, isCached: true };
          }
        } else {
          await this.clearUserCache(userId);
        }
      }
      
      // 2. Buscar URL do Supabase na tabela profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Database error:', error);
        return this.getFallbackImage();
      }
      

      
      // 3. Se tem URL no Supabase, tentar cachear e usar
      if (profile?.profile_picture_url) {
        
        // Primeiro, verificar se o arquivo existe no storage
        const fileExists = await this.checkFileExistsInStorage(userId, profile.profile_picture_url);
        
        if (!fileExists) {
          // Limpar URL inválida do banco de dados
          await supabase
            .from('profiles')
            .update({ profile_picture_url: null })
            .eq('id', userId);
            
          return this.getFallbackImage();
        }
        

        
        // Ir direto para signed URL (bucket é privado)
        const signedUrl = await this.getSignedUrl(profile.profile_picture_url);
        
        if (signedUrl) {
          
          const cachedViaSigned = await this.downloadAndCacheImage(userId, signedUrl);
          
          if (cachedViaSigned) {
            return { source: { uri: cachedViaSigned }, isCached: true };
          } else {
            return { source: { uri: signedUrl }, isCached: false };
          }
        }
        
        return this.getFallbackImage();
      }
      
      // 4. Sem URL no Supabase, usar fallback
      return this.getFallbackImage();
      
    } catch (error) {
      console.error('Error in getProfileImage:', error);
      return this.getFallbackImage();
    }
  },

  // Obter imagem de fallback (ilustração padrão)
  getFallbackImage(): { source: any; isCached: boolean } {
    
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
    
    return { source: defaultIllustration, isCached: true };
  },

  // Limpar cache de um usuário específico
  async clearUserCache(userId: string): Promise<void> {
    try {
      const localPath = this.getLocalCachePath(userId);
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);

        
        // Remover dos metadados
        const metadata = await this.getCacheMetadata();
        delete metadata[userId];
        await this.saveCacheMetadata(metadata);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  // Limpar todo o cache
  async clearAllCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIR);
        await AsyncStorage.removeItem(CACHE_METADATA_KEY);

      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
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
      console.error('Error getting cache stats:', error);
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
        console.error('Error checking storage:', error);
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
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      console.log('✅ [ImageCache] Signed URL created successfully');
      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  },

  // Invalidar cache quando imagem for atualizada
  async invalidateUserCache(userId: string): Promise<void> {
    console.log('🔄 [ImageCache] Invalidating cache for user:', userId);
    await this.clearUserCache(userId);
  }
};
