import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionCacheData {
  place: string; // 'Indoor' or 'Outdoor'
  location: string; // address/place name
  location_data: any; // rich location data from Google Places API
  activity: string; // 'Climbing' or 'Bouldering'
}

const CACHE_KEY = 'session_step1_cache';

export const SessionCacheService = {
  /**
   * Save step 1 data to cache
   */
  async saveStep1Data(data: SessionCacheData): Promise<void> {
    try {
      const cacheData = {
        place: data.place,
        location: data.location,
        location_data: data.location_data,
        activity: data.activity,
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Session Step 1 data cached:', cacheData);
    } catch (error) {
      console.error('Error saving session cache:', error);
    }
  },

  /**
   * Load step 1 data from cache
   */
  async loadStep1Data(): Promise<SessionCacheData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return {
          place: parsed.place,
          location: parsed.location,
          location_data: parsed.location_data,
          activity: parsed.activity,
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading session cache:', error);
      return null;
    }
  },

  /**
   * Check if cache has valid data
   */
  async hasValidCache(): Promise<boolean> {
    try {
      const cachedData = await this.loadStep1Data();
      return cachedData !== null && 
             cachedData.place.trim() !== '' && 
             cachedData.location.trim() !== '' && 
             cachedData.activity.trim() !== '';
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  },

  /**
   * Clear cache data
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('Session cache cleared');
    } catch (error) {
      console.error('Error clearing session cache:', error);
    }
  },

  /**
   * Get cache info for debugging
   */
  async getCacheInfo(): Promise<{hasCache: boolean, data?: any, timestamp?: string}> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return {
          hasCache: true,
          data: parsed,
          timestamp: parsed.timestamp
        };
      }
      return { hasCache: false };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { hasCache: false };
    }
  }
};
