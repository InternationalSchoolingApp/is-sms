"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { BookClassSlotModal } from "@/components/student/bookClass/BookClassSlotModal";
import { DemandBookPanel } from "@/components/student/bookClass/DemandBookPanel";
import { linkGridBooking } from "@/utils/demandBooking";

/** "Book a Class" pop-up: date and time first (demand booking); the weekly grid on "View all slots" or when it is switched off. */
export function DemandBookModal({ course, onClose, onBooked }) {
  const dummy = useDummyStudent();
  const [grid, setGrid] = useState(false);

  if (grid || dummy.enabled) {
    return (
      <BookClassSlotModal
        course={course}
        onClose={onClose}
        onBooked={(meetingStart) => {
          linkGridBooking(meetingStart);
          onBooked();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label={`Book a Class for ${course.name}`} className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-red-600 text-white hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="m-0 rounded-t-2xl bg-primary px-5 py-3 pr-10 text-base font-extrabold text-white">Book a Class for {course.name}</h2>
        <div className="flex-1 overflow-auto p-5 text-sm text-black">
          <DemandBookPanel
            options={[{ subjectId: course.subjectId, name: course.name, studentStandardId: course.studentStandardId }]}
            onDisabled={() => setGrid(true)}
            onViewAll={() => setGrid(true)}
            onBooked={() => onBooked()}
          />
        </div>
      </div>
    </div>
  );
}
