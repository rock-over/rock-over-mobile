import { supabase } from '../lib/supabase';
import { uploadProfilePictureAsync } from './uploadImage';

export interface ProfileData {
  id?: string;
  email?: string;
  name?: string;
  grading_system?: string;
  profile_picture_url?: string;
  bio?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileCreateData {
  email: string;
  name: string;
  grading_system?: string;
  profile_picture_url?: string;
  bio?: string;
  location?: string;
}

export const profileService = {
  // Criar novo perfil
  async createProfile(profileData: ProfileCreateData): Promise<ProfileData> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        id: supabase.auth.getUser().then(res => res.data.user?.id),
        ...profileData
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar perfil:', error);
      throw new Error('Falha ao criar o perfil');
    }

    return data;
  },

  // Buscar perfil do usuário atual
  async getCurrentUserProfile(): Promise<ProfileData | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile not found
        return null;
      }
      console.error('Erro ao buscar perfil:', error);
      throw new Error('Falha ao carregar o perfil');
    }

    return data;
  },

  // Buscar perfil por ID
  async getProfileById(id: string): Promise<ProfileData | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile not found
        return null;
      }
      console.error('Erro ao buscar perfil:', error);
      throw new Error('Falha ao carregar o perfil');
    }

    return data;
  },

  // Atualizar perfil
  async updateProfile(profileData: Partial<ProfileData>): Promise<ProfileData> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw new Error('Falha ao atualizar o perfil');
    }

    return data;
  },

  // Upload e atualização da foto de perfil
  async uploadAndUpdateProfilePicture(localUri: string): Promise<string> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Upload da imagem para o bucket profile-pics (privado)
      const imagePath = await uploadProfilePictureAsync(localUri, user.id);
      
      // Atualizar o perfil com o path da imagem (não URL pública)
      const updatedProfile = await this.updateProfile({
        profile_picture_url: imagePath
      });

      return imagePath;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  // Upload e atualização da foto de perfil para usuários Facebook (sem sessão Supabase)
  async uploadAndUpdateProfilePictureForFacebook(localUri: string, userId: string): Promise<string> {
    try {
      console.log('[profileService] 📤 Uploading Facebook user profile picture...');
      
      // Upload da imagem para o bucket profile-pics (privado)
      const imagePath = await uploadProfilePictureAsync(localUri, userId);
      
      console.log('[profileService] 🔒 Stored private image path:', imagePath);
      
      // Atualizar o perfil diretamente na tabela profiles com o path (não URL pública)
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_picture_url: imagePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[profileService] ❌ Error updating profile in database:', error);
        throw error;
      }

      console.log('[profileService] ✅ Facebook user profile picture updated successfully');
      return imagePath;
      
    } catch (error) {
      console.error('[profileService] ❌ Error uploading Facebook profile picture:', error);
      throw error;
    }
  },

  // Criar ou atualizar perfil (upsert)
  async upsertProfile(profileData: ProfileCreateData): Promise<ProfileData> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert([{
        id: user.id,
        ...profileData
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar/atualizar perfil:', error);
      throw new Error('Falha ao salvar o perfil');
    }

    return data;
  },

  // Criar ou atualizar perfil para usuários Facebook (sem sessão Supabase)
  async upsertProfileForFacebook(profileData: ProfileCreateData, userId: string): Promise<ProfileData> {
    console.log('[profileService] 🔄 Upserting Facebook user profile...');
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert([{
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('[profileService] ❌ Error upserting Facebook profile:', error);
      throw new Error('Falha ao salvar o perfil do Facebook');
    }

    console.log('[profileService] ✅ Facebook profile upserted successfully');
    return data;
  },

  // Deletar perfil
  async deleteProfile(): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (error) {
      console.error('Erro ao deletar perfil:', error);
      throw new Error('Falha ao deletar o perfil');
    }
  },

  // Obter signed URL da imagem de perfil (privada)
  async getProfilePictureSignedUrl(imagePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(imagePath, 3600); // 1 hora de validade
      
      if (error) {
        console.error('[profileService] Error creating signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('[profileService] Error creating signed URL:', error);
      return null;
    }
  }
};
