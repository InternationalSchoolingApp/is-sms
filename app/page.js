import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth()
  if (!session){
    redirect(process.env.NEXT_PUBLIC_BACKEND_BASE_URL);
  }
  const {schoolUUID, step="student-details"} = session; 
  redirect(`/${schoolUUID}/step/${step}`);
}
