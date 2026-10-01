import Link from 'next/link';
import React from 'react'
const programs = [
  {
    name: "One to One",
    url: "O"
  },
  {
    name: "Group",
    url: "G"
  },
  {
    name: "Dual Diploma",
    url: "DD"
  },
]
export default async function  page({params}) {
  const {school} = await params;
  return (
    <div>{
      programs.map((item, index) => {
        return <Link key={index} href={`${process.env.NEXTAUTH_URL}/${school}/enrollment/${item.url}`}>
          {item.name}
        </Link>
      })
      }</div>
  )
}
