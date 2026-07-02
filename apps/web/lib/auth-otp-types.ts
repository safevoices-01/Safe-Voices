export type SendOtpResult =
    | { ok: true }
    | { ok: false; error: 'invalid_email' | 'network' | 'rate_limited' };

export type VerifyOtpError = 'invalid' | 'expired' | 'network';

export type VerifyOtpResult =
    | { ok: true }
    | { ok: false; error: VerifyOtpError };

/** Pluggable client; swap for real API (e.g. tRPC, fetch to `/api/auth/otp`). */
export type OtpClient = {
    sendOtp: (email: string) => Promise<SendOtpResult>;
    verifyOtp: (email: string, code: string) => Promise<VerifyOtpResult>;
};
