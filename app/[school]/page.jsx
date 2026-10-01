import { SCHOOL_URLS } from '@/constant/SchoolConstants';
import { redirect } from 'next/navigation';
import React from 'react'

export default async function SchoolBasePage({params}) {
    const {school} = await params;
    const {url} = SCHOOL_URLS.find((item)=> item.schoolUUID === school);
    redirect(url);
  
}
