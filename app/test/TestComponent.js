"use client"
import { getStatesAndCitites } from '@/services/serverApi';
import { Button } from '@base-ui/react';
import React from 'react'

export default function TestComponent() {

   
  async function getDetails() {
    const response = await getStatesAndCitites();
    console.log(response);
  }

  return (
     <Button
                type="button"
                onClick={()=>getDetails()}
                className="h-11 min-w-[110px] rounded-xl bg-primary px-7 text-[15px] font-semibold text-white shadow-sm hover:bg-primary/90"
              >
               City
              </Button>
  )
}
