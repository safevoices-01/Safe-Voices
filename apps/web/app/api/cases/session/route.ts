import { cookies } from 'next/headers';
import { handleCaseSessionGet } from '@safevoices/trpc/case-handlers';
import { CASE_SESSION_COOKIE } from '../../../../lib/case-access';

export async function GET(): Promise<Response> {
    const cookieStore = await cookies();
    const token = cookieStore.get(CASE_SESSION_COOKIE)?.value;
    return handleCaseSessionGet(token);
}
