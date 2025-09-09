import { Platform } from 'react-native';
import { supabase, getManualSession } from './supabase';

/**
 * Helper para operações autenticadas do Supabase que funciona tanto com:
 * - Sessões reais (Android/Web)
 * - Sessões manuais (iOS)
 */

// Get current user - works for both real and manual sessions
export const getCurrentUser = async () => {
  try {
    if (Platform.OS === 'ios') {
      // For iOS, try manual session first
      const manualSession = await getManualSession();
      if (manualSession) {
        console.log('[SupabaseHelper] Using iOS manual session user');
        return manualSession.user;
      }
    }
    
    // Fallback to real Supabase session (Android/Web or iOS if real session exists)
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log('[SupabaseHelper] No real session available:', error.message);
      return null;
    }
    
    console.log('[SupabaseHelper] Using real Supabase session user');
    return user;
  } catch (error) {
    console.error('[SupabaseHelper] Error getting current user:', error);
    return null;
  }
};

// Execute authenticated operation - adds proper headers for iOS manual sessions
export const executeAuthenticatedOperation = async (operation: () => Promise<any>) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // For iOS manual sessions, we need to handle operations differently
    if (Platform.OS === 'ios') {
      const manualSession = await getManualSession();
      if (manualSession) {
        console.log('[SupabaseHelper] Executing operation with iOS manual session');
        // For manual sessions, we can't use RLS but we can identify the user
        return await operation();
      }
    }

    // For real sessions, execute normally
    console.log('[SupabaseHelper] Executing operation with real session');
    return await operation();
  } catch (error) {
    console.error('[SupabaseHelper] Error in authenticated operation:', error);
    throw error;
  }
};

// Insert with user context - automatically adds user_id for iOS manual sessions
export const insertWithUserContext = async (
  table: string,
  data: any,
  options?: { userIdField?: string }
) => {
  const userIdField = options?.userIdField || 'user_id';
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const dataWithUser = {
      ...data,
      [userIdField]: user.id
    };

    console.log(`[SupabaseHelper] Inserting into ${table} with user context:`, {
      userId: user.id,
      platform: Platform.OS
    });

    const { data: result, error } = await supabase
      .from(table)
      .insert(dataWithUser)
      .select();

    if (error) {
      throw error;
    }

    return { data: result, error: null };
  } catch (error: any) {
    console.error(`[SupabaseHelper] Error inserting into ${table}:`, error);
    return { data: null, error: error };
  }
};

// Update with user context - automatically filters by user_id for iOS manual sessions
export const updateWithUserContext = async (
  table: string,
  data: any,
  where: any,
  options?: { userIdField?: string }
) => {
  const userIdField = options?.userIdField || 'user_id';
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Add user filter to where clause for security
    const secureWhere = {
      ...where,
      [userIdField]: user.id
    };

    console.log(`[SupabaseHelper] Updating ${table} with user context:`, {
      userId: user.id,
      platform: Platform.OS
    });

    let query = supabase.from(table).update(data);
    
    // Apply where conditions
    Object.entries(secureWhere).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query.select();

    if (error) {
      throw error;
    }

    return { data: result, error: null };
  } catch (error: any) {
    console.error(`[SupabaseHelper] Error updating ${table}:`, error);
    return { data: null, error: error };
  }
};

// Select with user context - automatically filters by user_id for iOS manual sessions  
export const selectWithUserContext = async (
  table: string,
  select: string = '*',
  where?: any,
  options?: { userIdField?: string }
) => {
  const userIdField = options?.userIdField || 'user_id';
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Add user filter to where clause for security
    const secureWhere = {
      ...(where || {}),
      [userIdField]: user.id
    };

    console.log(`[SupabaseHelper] Selecting from ${table} with user context:`, {
      userId: user.id,
      platform: Platform.OS
    });

    let query = supabase.from(table).select(select);
    
    // Apply where conditions
    Object.entries(secureWhere).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`[SupabaseHelper] Error selecting from ${table}:`, error);
    return { data: null, error: error };
  }
};

// Storage upload with user context - works with manual sessions
export const uploadWithUserContext = async (
  bucket: string,
  path: string,
  file: any,
  options?: any
) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Create user-specific path
    const userPath = `${user.id}/${path}`;

    console.log(`[SupabaseHelper] Uploading to ${bucket}/${userPath}:`, {
      userId: user.id,
      platform: Platform.OS
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(userPath, file, options);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`[SupabaseHelper] Error uploading to ${bucket}:`, error);
    return { data: null, error: error };
  }
};

// Get public URL for storage
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
    
  return data.publicUrl;
};
