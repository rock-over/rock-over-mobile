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
      console.log('📤 [profileService] Starting profile picture upload for user:', user.id);
      
      // Upload da imagem para o bucket profile-pics
      const imagePath = await uploadProfilePictureAsync(localUri, user.id);
      
      // Gerar URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(imagePath);

      console.log('🔗 [profileService] Generated public URL:', publicUrl);
      
      // Atualizar o perfil com a nova URL da imagem
      const updatedProfile = await this.updateProfile({
        profile_picture_url: publicUrl
      });

      console.log('✅ [profileService] Profile picture uploaded and profile updated successfully');
      
      return publicUrl;
    } catch (error) {
      console.error('❌ [profileService] Error uploading profile picture:', error);
      throw error;
    }
  },

  // Criar ou atualizar perfil (upsert)
  async upsertProfile(profileData: ProfileCreateData): Promise<ProfileData> {
    console.log('💾 [profileService] upsertProfile called with data:', profileData);
    
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
      console.error('❌ [profileService] Erro ao criar/atualizar perfil:', error);
      throw new Error('Falha ao salvar o perfil');
    }

    console.log('✅ [profileService] Profile saved successfully:', data);
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

  // Obter URL pública da imagem de perfil
  getProfilePictureUrl(imagePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pics')
      .getPublicUrl(imagePath);
    
    return publicUrl;
  }
};
