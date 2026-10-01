import { SCHOOL_URLS } from '@/constant/SchoolConstants';
import { notFound, redirect } from 'next/navigation';
import React from 'react'

export default async function SchoolBasePage({params}) {
    const {school} = await params;
    const match = SCHOOL_URLS.find((item)=> item.schoolUUID === school);
    if (!match) notFound();
    redirect(match.url);

}
