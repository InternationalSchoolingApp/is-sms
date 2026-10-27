"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getStudentCourseContent } from "@/services/dashboardApi";

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Per-course content drawer opened from a Syllabus course row — live Buzz LMS
 * module/item list (thin or empty for non-LMS course providers).
 */
export function SyllabusCourseContentModal({ course, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { data, isLoading } = useQuery({
    queryKey: ["student-course-content", schoolUUID, course.lmsUserId, course.lmsCourseId],
    queryFn: () => getStudentCourseContent({ schoolUUID, userId, lmsUserId: course.lmsUserId, lmsCourseId: course.lmsCourseId }),
    enabled: Boolean(schoolUUID && userId && course.lmsUserId),
  });

  const modules = asArray(data?.modules);

  return (
    <CalendarModal title={course.courseName} onClose={onClose}>
      {isLoading ? (
        <p className="py-4 text-center text-black/50">Loading…</p>
      ) : modules.length === 0 ? (
        <p className="py-4 text-center text-black/50">No course content available yet.</p>
      ) : (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {modules.map((module, index) => (
            <div key={index}>
              <h3 className="text-sm font-extrabold text-black">{module.moduleName}</h3>
              <ul className="mt-1 space-y-1">
                {asArray(module.items).map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2 py-1.5">
                    <span className="text-black">{item.contentName}</span>
                    {item.dueDate && <span className="flex-shrink-0 text-xs text-black/50">Due {item.dueDate}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CalendarModal>
  );
}
