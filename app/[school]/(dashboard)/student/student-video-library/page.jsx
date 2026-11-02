import { VideoLibrary } from "@/components/student/videoLibrary/VideoLibrary";

// Route segment matches the live sidebar pageLink for "Video Library"
// (student-video-library), so this page overrides the student/[...module] catch-all.
export default function VideoLibraryPage() {
  return <VideoLibrary />;
}
