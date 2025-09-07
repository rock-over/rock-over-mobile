import { supabase } from '../lib/supabase';

export interface ClimbingSessionData {
  place: string | null;
  location?: string | null; // NEW: Nome específico do local (gym, setor, etc)
  location_data?: {
    name?: string;
    description?: string;
    place_id?: string;
    formatted_address?: string;
    main_text?: string;
    secondary_text?: string;
    types?: string[];
    vicinity?: string;
    latitude?: number;
    longitude?: number;
    distance_km?: number;
  } | null; // Rich location data from Google Places API
  when: string;
  timeOfDay: string | null;
  activity: string | null;
  climbingType?: string | null;
  routeNumber?: string | null;
  grade?: string | null;
  completion?: string | null;
  difficulty: string | null;
  effort: string | null;
  falls: string | null;
  ascentType: string | null;
  colour?: string | null;
  routeRating?: string | null;
  suggestedGrade?: string | null; // Campo existente no SessionDetails
  settersRating?: string | null;  // Campo existente no SessionDetails
  howItFelt?: string | null;
  movement?: string | null;
  grip?: string | null;
  footwork?: string | null;
  comments?: string | null;
  images?: string[] | null;
  user_email?: string;
}

export interface ClimbingSession extends ClimbingSessionData {
  id: string;
  created_at: string;
}

export const climbingSessionService = {
  // Criar nova sessão
  async createSession(sessionData: ClimbingSessionData): Promise<ClimbingSession> {
    const { data, error } = await supabase
      .from('climbing_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar sessão:', error);
      throw new Error('Falha ao salvar a sessão');
    }

    return data;
  },

  // Buscar todas as sessões do usuário
  async getUserSessions(userEmail: string): Promise<ClimbingSession[]> {
    const { data, error } = await supabase
      .from('climbing_sessions')
      .select('*')
      .eq('user_email', userEmail)
      .order('when', { ascending: false });

    if (error) {
      console.error('Erro ao buscar sessões:', error);
      throw new Error('Falha ao carregar as sessões');
    }

    return data || [];
  },

  // Atualizar sessão
  async updateSession(id: string, sessionData: Partial<ClimbingSessionData>): Promise<ClimbingSession> {
    const { data, error } = await supabase
      .from('climbing_sessions')
      .update(sessionData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar sessão:', error);
      throw new Error('Falha ao atualizar a sessão');
    }

    return data;
  },

  // Deletar sessão
  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('climbing_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar sessão:', error);
      throw new Error('Falha ao deletar a sessão');
    }
  },
}; 