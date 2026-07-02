import type {
    OtpClient,
    SendOtpResult,
    VerifyOtpResult,
} from './auth-otp-types';
import { isValidEmailFormat } from './validate-email';

/** Deterministic code for tests and local dev (`123456` = success). */
export const MOCK_OTP_SUCCESS_CODE = '123456';
export const MOCK_OTP_EXPIRED_CODE = '000000';
export const MOCK_OTP_INVALID_CODE = '111111';

export type MockOtpOptions = {
    sendDelayMs?: number;
    verifyDelayMs?: number;
    failNextVerifyWith?: VerifyOtpResult & { ok: false };
    failNextSendWith?: SendOtpResult & { ok: false };
};

export function createMockOtpClient(options: MockOtpOptions = {}): OtpClient & {
    resetFailures: () => void;
} {
    let failVerify: (VerifyOtpResult & { ok: false }) | undefined =
        options.failNextVerifyWith;
    let failSend: (SendOtpResult & { ok: false }) | undefined =
        options.failNextSendWith;

    const delay = (ms: number) =>
        new Promise<void>((r) => {
            setTimeout(r, ms);
        });

    return {
        resetFailures: () => {
            failVerify = undefined;
            failSend = undefined;
        },

        async sendOtp(email: string): Promise<SendOtpResult> {
            await delay(options.sendDelayMs ?? 400);
            if (failSend) {
                const err = failSend;
                failSend = undefined;
                return err;
            }
            if (!isValidEmailFormat(email)) {
                return { ok: false, error: 'invalid_email' };
            }
            return { ok: true };
        },

        async verifyOtp(email: string, code: string): Promise<VerifyOtpResult> {
            await delay(options.verifyDelayMs ?? 400);
            if (failVerify) {
                const err = failVerify;
                failVerify = undefined;
                return err;
            }
            if (!isValidEmailFormat(email)) {
                return { ok: false, error: 'invalid' };
            }
            if (code === MOCK_OTP_SUCCESS_CODE) return { ok: true };
            if (code === MOCK_OTP_EXPIRED_CODE) {
                return { ok: false, error: 'expired' };
            }
            if (code === MOCK_OTP_INVALID_CODE) {
                return { ok: false, error: 'invalid' };
            }
            return { ok: false, error: 'invalid' };
        },
    };
}
