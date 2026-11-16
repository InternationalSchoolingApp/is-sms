"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  deleteTeacherDocument,
  getTeacherProfessionalDetails,
  getTeacherSubjectDetails,
  saveTeacherProfessionalDetails,
} from "@/services/teacherSignupApi";
import { buildAuthenticatedRequest } from "@/utils/authentication";
import {
  buildSaveTeacherProfessionalRequest,
  hasTeacherDemoLink,
  mapTeacherDocuments,
  mapTeacherProfessionalToFields,
} from "@/utils/teacherProfessionalDetails";

const USER_TYPE = "TEACHER";
const STATUS_SUCCESS = "1";

export const TEACHER_PROFESSIONAL_QUERY_KEY = "teacher-professional-details";

/**
 * Everything Step 2 shows, resolved BEFORE the form mounts (it reads its initial values at mount only):
 *   { fields, documents: { [fileType]: { name, url } }, linkMode, courseLists, recordingUrls }
 * `courseLists` are the three bands' selectable titles. The saved record and the course lists are both needed, so
 * either one failing fails the query (the step shows a retry, not a half-empty form that could be saved over the
 * teacher's real data). Always fresh (staleTime 0): Back from the next step must show what was just saved, and the
 * documents change outside this query (upload / delete).
 */
export function useTeacherProfessionalPrefill({ context, userId }) {
  return useQuery({
    queryKey: [TEACHER_PROFESSIONAL_QUERY_KEY, userId],
    queryFn: async () => {
      const [details, subjects] = await Promise.all([
        getTeacherProfessionalDetails(context.schoolUUID, userId),
        getTeacherSubjectDetails(context.schoolUUID, userId),
      ]);
      const teacherDetails = details?.details?.teacherDetails;
      const subjectDetails = subjects?.details?.subjectDetails;
      if (details?.status !== STATUS_SUCCESS || !teacherDetails || subjects?.status !== STATUS_SUCCESS || !subjectDetails) {
        throw new Error("Could not load the professional details");
      }
      return {
        fields: mapTeacherProfessionalToFields(teacherDetails, subjectDetails),
        documents: mapTeacherDocuments(teacherDetails),
        linkMode: hasTeacherDemoLink(teacherDetails),
        courseLists: {
          elementary: subjectDetails.elementryAllSubject || [],
          middle: subjectDetails.middleAllSubject || [],
          high: subjectDetails.highAllSubject || [],
        },
        recordingUrls: details.recordingUrls || null,
      };
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useTeacherProfessionalSave({ context, userId }) {
  return useMutation({
    mutationFn: ({ fields, linkMode }) =>
      saveTeacherProfessionalDetails(
        context.schoolUUID,
        buildSaveTeacherProfessionalRequest({
          fields,
          authentication: buildAuthenticatedRequest(context, userId, USER_TYPE),
          userId,
          linkMode,
        })
      ),
  });
}

export function useTeacherDocumentDelete({ context }) {
  return useMutation({
    mutationFn: (fileType) => deleteTeacherDocument(context.schoolUUID, fileType),
  });
}
