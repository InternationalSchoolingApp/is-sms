import { MyProfile } from "@/components/student/MyProfile";

// "My Profile" from the header's profile menu (K5Header / DashboardTopHeader). The segment overrides the
// student/[...module] catch-all, like my-certificates.
export default function MyProfilePage() {
  return <MyProfile />;
}
