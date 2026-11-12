import { SCHOOL_URLS } from '@/constant/SchoolConstants';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAccountSession } from '@/lib/auth/session';
import { LAST_DASHBOARD_PATH_COOKIE, safeDashboardPath } from '@/utils/lastDashboardPath';


export default async function SchoolBasePage({params}) {
    const {school} = await params;
    const match = SCHOOL_URLS.find((item)=> item.schoolUUID === school);
    if (!match) notFound();

    // Logged in to this school: stay in the app, back on the dashboard page the user last had open.
    const session = await getAccountSession();
    if (session?.userId && session.schoolUUID === school) {
        const lastPath = (await cookies()).get(LAST_DASHBOARD_PATH_COOKIE)?.value;
        redirect(safeDashboardPath(lastPath, school, session.role));
    }
    redirect(match.url);

}
