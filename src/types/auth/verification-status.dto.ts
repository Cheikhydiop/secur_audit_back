export interface VerificationStatusResponse {
  hasActiveCode: boolean;
  expiresInMinutes?: number;
  canRequestNewCode: boolean;
  nextCodeRequestInMinutes?: number;
  remainingAttempts?: number;
  verificationStatus: {
    isVerified: boolean;
    lastAttemptInMinutes?: number;
  };
}
