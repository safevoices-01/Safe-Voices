import type {
    OtpClient,
    SendOtpResult,
    VerifyOtpResult,
} from './auth-otp-types';

function mapSendError(code?: string): SendOtpResult {
    if (code === 'OTP_RATE_LIMITED') {
        return { ok: false, error: 'rate_limited' };
    }
    if (code === 'PARTNER_NOT_ALLOWED') {
        return { ok: false, error: 'invalid_email' };
    }
    return { ok: false, error: 'network' };
}

function mapVerifyError(code?: string): VerifyOtpResult {
    if (code === 'OTP_EXPIRED') {
        return { ok: false, error: 'expired' };
    }
    if (code === 'OTP_INVALID' || code === 'OTP_RATE_LIMITED') {
        return { ok: false, error: 'invalid' };
    }
    return { ok: false, error: 'network' };
}

export function createPartnerOtpApiClient(): OtpClient {
    return {
        async sendOtp(email: string): Promise<SendOtpResult> {
            try {
                const res = await fetch('/api/auth/partner/otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.trim() }),
                });
                if (res.ok) return { ok: true };
                const json = (await res.json()) as { code?: string };
                return mapSendError(json.code);
            } catch {
                return { ok: false, error: 'network' };
            }
        },

        async verifyOtp(email: string, code: string): Promise<VerifyOtpResult> {
            try {
                const res = await fetch('/api/auth/partner/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email: email.trim(), code }),
                });
                if (res.ok) return { ok: true };
                const json = (await res.json()) as { code?: string };
                return mapVerifyError(json.code);
            } catch {
                return { ok: false, error: 'network' };
            }
        },
    };
}
