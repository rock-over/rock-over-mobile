import { AppEventsLogger } from 'react-native-fbsdk-next';

/**
 * Serviço para rastrear eventos Facebook Analytics no Rock Over
 */
export class FacebookEventsService {
  
  /**
   * Rastrear quando usuário completa perfil
   */
  static logCompleteRegistration(method: 'email' | 'google' | 'facebook') {
    try {
      AppEventsLogger.logEvent('CompleteRegistration', null, {
        'fb_registration_method': method
      });
      console.log('[FacebookEvents] 📊 Registration completed:', method);
    } catch (error) {
      console.log('[FacebookEvents] ❌ Error logging registration:', error);
    }
  }

  /**
   * Rastrear quando usuário cria uma sessão de escalada
   */
  static logClimbingSessionCreated(sessionType: 'bouldering' | 'outdoor' | 'indoor') {
    try {
      AppEventsLogger.logEvent('fb_mobile_add_to_cart', null, {
        'session_type': sessionType,
        'fb_content_type': 'climbing_session'
      });
      console.log('[FacebookEvents] 📊 Climbing session created:', sessionType);
    } catch (error) {
      console.log('[FacebookEvents] ❌ Error logging session creation:', error);
    }
  }

  /**
   * Rastrear quando usuário completa uma sessão de escalada
   */
  static logClimbingSessionCompleted(sessionType: 'bouldering' | 'outdoor' | 'indoor', routesCount: number) {
    try {
      AppEventsLogger.logEvent('fb_mobile_achievement_unlocked', null, {
        'session_type': sessionType,
        'routes_completed': routesCount.toString(),
        'fb_description': `Completed ${routesCount} routes in ${sessionType} session`
      });
      console.log('[FacebookEvents] 📊 Session completed:', sessionType, 'routes:', routesCount);
    } catch (error) {
      console.log('[FacebookEvents] ❌ Error logging session completion:', error);
    }
  }

  /**
   * Rastrear quando usuário faz upload de foto
   */
  static logPhotoUpload(context: 'profile' | 'session') {
    try {
      AppEventsLogger.logEvent('fb_mobile_content_view', null, {
        'fb_content_type': 'photo',
        'upload_context': context
      });
      console.log('[FacebookEvents] 📊 Photo uploaded:', context);
    } catch (error) {
      console.log('[FacebookEvents] ❌ Error logging photo upload:', error);
    }
  }

  /**
   * Rastrear quando usuário busca locais
   */
  static logLocationSearch(query: string) {
    try {
      AppEventsLogger.logEvent('fb_mobile_search', null, {
        'fb_search_string': query,
        'fb_content_type': 'location'
      });
      console.log('[FacebookEvents] 📊 Location search:', query);
    } catch (error) {
      console.log('[FacebookEvents] ❌ Error logging location search:', error);
    }
  }

  /**
   * Rastrear quando usuário troca sistema de graduação
   */
  static logGradingSystemChange(fromSystem: string, toSystem: string) {
    try {
      AppEventsLogger.logEvent('fb_mobile_app_settings_change', null, {
        'setting_type': 'grading_system',
        'from_value': fromSystem,
        'to_value': toSystem
      });
      console.log('[FacebookEvents] 📊 Grading system changed:', fromSystem, '->', toSystem);
    } catch (error) {
      console.log('[FacebookEvents] ❌ Error logging grading system change:', error);
    }
  }

  /**
   * Rastrear erros importantes da aplicação
   */
  static logAppError(errorType: string, errorMessage: string) {
    try {
      AppEventsLogger.logEvent('fb_mobile_app_error', null, {
        'error_type': errorType,
        'error_message': errorMessage.substring(0, 100) // Limitar tamanho
      });
      console.log('[FacebookEvents] 📊 App error logged:', errorType);
    } catch (error) {
      console.log('[FacebookEvents] ❌ Error logging app error:', error);
    }
  }
}

// Export default para facilitar imports
export default FacebookEventsService;

