// src/config/rateLimit.config.ts
export const RateLimitConfig = {
    // Authentification
    AUTH: {
      MAX_ATTEMPTS: 5,
      WINDOW_MS: 900000, // 15 minutes
      WARNING_THRESHOLD: 2,
    },
    
    // Inscription
    REGISTRATION: {
      MAX_ATTEMPTS: 3,
      WINDOW_MS: 3600000, // 1 heure
    },
    
    // Vérification OTP
    VERIFICATION: {
      MAX_ATTEMPTS: 5,
      WINDOW_MS: 300000, // 5 minutes
    },
    
    // Général
    GENERAL: {
      MAX_ATTEMPTS: 100,
      WINDOW_MS: 60000, // 1 minute
    }
  } as const;