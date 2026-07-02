export type PartnerUserRecord = {
    id: string;
    email: string;
    orgId: string;
    role: 'investigator' | 'admin';
};

export type PartnerSessionRecord = {
    token: string;
    partnerUserId: string;
    email: string;
    orgId: string;
    expiresAt: Date;
};

export type IssueOtpResult =
    | { ok: true; code: string }
    | { ok: false; reason: 'not_allowed' | 'rate_limited' };

export type VerifyPartnerOtpResult =
    | {
          ok: true;
          token: string;
          expiresAt: Date;
          partnerUserId: string;
          email: string;
          orgId: string;
      }
    | { ok: false; reason: 'invalid' | 'expired' | 'locked' };

export interface PartnerStore {
    issueOtp(email: string): Promise<IssueOtpResult>;
    verifyOtp(email: string, code: string): Promise<VerifyPartnerOtpResult>;
    resolveSession(token: string | undefined): Promise<PartnerSessionRecord | null>;
    revokeSession(token: string): Promise<void>;
}
