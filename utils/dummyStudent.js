/**
 * Dummy (demo) student data — a port of the legacy dummyStudentDashboardData.js generator
 * (is-rest-api static/theme2/js/custom). When dummy mode is on (demo account or ?dummyStudent=Y,
 * see utils/paymentGatewayChecks.js isDummyStudentMode) each module returns these responses instead
 * of calling the backend; every builder keeps the real API's response shape.
 *
 * Inputs mirror legacy: the demo-data row (/dashboard/student/demo-data, picked at "view as user"
 * time), the URL params (dummyDate, dummyGrade, dummyStandardId, demoStudentName, demoLearningProgram,
 * demoCourseId, ...) and the built-in grade tables when there is neither. No DOM / jQuery here.
 * Ported so far: Phase 1 (login history, fee details, academic performance, progress reports) and
 * Phase 2 (attendance, assigned teacher, transcript)
 * — see docs/migration/dummy-student-mode-plan.md.
 */

const GRADE_CONFIG = {
  K: { standardId: 11, standardName: "KINDERGARTEN", label: "Grade K" },
  1: { standardId: 12, standardName: "GRADE 1", label: "Grade 1" },
  2: { standardId: 13, standardName: "GRADE 2", label: "Grade 2" },
  3: { standardId: 14, standardName: "GRADE 3", label: "Grade 3" },
  4: { standardId: 15, standardName: "GRADE 4", label: "Grade 4" },
  5: { standardId: 16, standardName: "GRADE 5", label: "Grade 5" },
  6: { standardId: 1, standardName: "GRADE 6", label: "Grade 6" },
  7: { standardId: 2, standardName: "GRADE 7", label: "Grade 7" },
  8: { standardId: 3, standardName: "GRADE 8", label: "Grade 8" },
  9: { standardId: 4, standardName: "GRADE 9", label: "Grade 9" },
  10: { standardId: 5, standardName: "GRADE 10", label: "Grade 10" },
  11: { standardId: 6, standardName: "GRADE 11", label: "Grade 11" },
  12: { standardId: 7, standardName: "GRADE 12", label: "Grade 12" },
};
const GRADE_KEYS = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const SUBJECT_ROWS = {
  K: [["LA", "Language Arts Grade K", "Language-Arts.jpg"], ["MATH", "Mathematics Grade K", "Mathematics.jpg"], ["SCI", "Science Grade K", "Science.jpg"], ["TECH", "Technology Grade K", "Technology-and-Research.jpg"], ["ART", "Art Grade K", "Fine-arts.jpg"], ["PE", "Physical Education Grade K", "Physical education.jpg"]],
  1: [["LA", "Language Arts Grade 1", "Language-Arts.jpg"], ["MATH", "Mathematics Grade 1", "Mathematics.jpg"], ["SCI", "Science Grade 1", "Science.jpg"], ["SOC", "Social Studies Grade 1", "Social-science.jpg"], ["ART", "Art Grade 1", "Fine-arts.jpg"], ["PE", "Physical Education Grade 1", "Physical education.jpg"]],
  2: [["LA", "Language Arts Grade 2", "Language-Arts.jpg"], ["MATH", "Mathematics Grade 2", "Mathematics.jpg"], ["SCI", "Science Grade 2", "Science.jpg"], ["SOC", "Social Studies Grade 2", "Social-science.jpg"], ["MUSIC", "Music Grade 2", "Music.jpg"], ["PE", "Physical Education Grade 2", "Physical education.jpg"]],
  3: [["LA", "Language Arts Grade 3", "Language-Arts.jpg"], ["MATH", "Mathematics Grade 3", "Mathematics.jpg"], ["SCI", "Science Grade 3", "Science.jpg"], ["SOC", "Social Studies Grade 3", "Social-science.jpg"], ["COMP", "Computer Basics Grade 3", "Computer Basics.jpg"], ["ART", "Art Grade 3", "Fine-arts.jpg"]],
  4: [["LA", "Language Arts Grade 4", "Language-Arts.jpg"], ["MATH", "Mathematics Grade 4", "Mathematics.jpg"], ["SCI", "Science Grade 4", "Science.jpg"], ["SOC", "Social Studies Grade 4", "Social-science.jpg"], ["TECH", "Technology and Research Grade 4", "Technology-and-Research.jpg"], ["PE", "Physical Education Grade 4", "Physical education.jpg"]],
  5: [["LA", "Language Arts Grade 5", "Language-Arts.jpg"], ["MATH", "Mathematics Grade 5", "Mathematics.jpg"], ["SCI", "Science Grade 5", "Science.jpg"], ["SOC", "Social Studies Grade 5", "Social-science.jpg"], ["COMP", "Computer Science Grade 5", "computer-science.jpg"], ["HEALTH", "Health Grade 5", "Health.jpg"]],
  6: [["ENG", "English Grade 6", "English.jpg"], ["MATH", "Math Grade 6", "Math.jpg"], ["SCI", "Science Grade 6", "Science.jpg"], ["SOC", "Social Science Grade 6", "Social-science.jpg"], ["TECH", "Technology Grade 6", "Technology-and-Research.jpg"], ["PE", "Physical Education Grade 6", "Physical education.jpg"]],
  7: [["ENG", "English Grade 7", "English.jpg"], ["MATH", "Math Grade 7", "Math.jpg"], ["SCI", "Science Grade 7", "Science.jpg"], ["HIST", "History Grade 7", "History.jpg"], ["GEO", "Geography Grade 7", "Geography.jpg"], ["COMP", "Computer Science Grade 7", "computer-science.jpg"]],
  8: [["ENG", "English Grade 8", "English.jpg"], ["PREALG", "Pre-Algebra Grade 8", "Pre-Algebra.jpg"], ["SCI", "Physical Science Grade 8", "Physical-Science.jpg"], ["HIST", "World History Grade 8", "World History.jpg"], ["TECH", "Information Technology Grade 8", "IT.jpg"], ["ART", "Fine Arts Grade 8", "Fine-arts.jpg"]],
  9: [["ENG", "English 9", "English.jpg"], ["ALG1", "Algebra 1", "Algebra-1.jpg"], ["BIO", "Biology", "Biology.jpg"], ["WH", "World History", "World History.jpg"], ["SPAN", "Spanish", "spanish.jpg"], ["PE", "Physical Fitness", "Physical-Fitness.jpg"]],
  10: [["ENG", "English 10", "English.jpg"], ["GEO", "Geometry", "geometry.jpg"], ["CHEM", "Chemistry", "chemistry.jpg"], ["GOV", "Government and Politics", "Comparative-Government-and-Politics.jpg"], ["COMP", "Computer Science", "computer-science.jpg"], ["HEALTH", "Health", "Health.jpg"]],
  11: [["ENG", "English 11", "English.jpg"], ["ALG2", "Algebra 2", "Algebra-2.jpg"], ["PHY", "Physics", "Physics.jpg"], ["ECON", "Economics", "Economics.jpg"], ["PSY", "Psychology", "Psychology.jpg"], ["CS", "Computer Science", "computer-science.jpg"]],
  12: [["ENG", "English 12", "English.jpg"], ["PRECAL", "Pre-Calculus", "Pre-Calculus.jpg"], ["ENV", "Environmental Studies", "ENVIRONMENTAL-STUDIES.jpg"], ["GOV", "Government and Politics", "Comparative-Government-and-Politics.jpg"], ["FIN", "Personal Financial Literacy", "Personal-Financial-Literacy.jpg"], ["MEDIA", "Media Studies", "Media-Studies.jpg"]],
};

const TEACHERS = ["Ms. Olivia Parker", "Ms. Emma Johnson", "Mr. Daniel Carter", "Ms. Sophia Williams", "Mr. Ethan Brooks", "Ms. Ava Thompson", "Dr. Mia Roberts", "Mr. Noah Anderson", "Ms. Lily Morgan", "Mr. Liam Foster", "Ms. Grace Bennett", "Mr. Lucas Rivera", "Ms. Isabella Clark", "Ms. Chloe Adams", "Mr. Henry Lee"];

const FEE_STRUCTURE = {
  Kindergarten: { group: [1186, 627, 627], oneToOne: [1470, 840, 840], installment: { group: 2440, oneToOne: 3150 }, lumpsum: { group: 2140, oneToOne: 2750 } },
  "Grade 1": { group: [1186, 627, 627], oneToOne: [1470, 840, 840], installment: { group: 2440, oneToOne: 3150 }, lumpsum: { group: 2140, oneToOne: 2750 } },
  "Grade 2": { group: [1186, 627, 627], oneToOne: [1470, 840, 840], installment: { group: 2440, oneToOne: 3150 }, lumpsum: { group: 2140, oneToOne: 2750 } },
  "Grade 3": { group: [1186, 627, 627], oneToOne: [1470, 840, 840], installment: { group: 2440, oneToOne: 3150 }, lumpsum: { group: 2140, oneToOne: 2750 } },
  "Grade 4": { group: [1186, 627, 627], oneToOne: [1470, 840, 840], installment: { group: 2440, oneToOne: 3150 }, lumpsum: { group: 2140, oneToOne: 2750 } },
  "Grade 5": { group: [1186, 627, 627], oneToOne: [1470, 840, 840], installment: { group: 2440, oneToOne: 3150 }, lumpsum: { group: 2140, oneToOne: 2750 } },
  "Grade 6": { group: [1330, 735, 735], oneToOne: [1690, 1005, 1005], installment: { group: 2800, oneToOne: 3700 }, lumpsum: { group: 2500, oneToOne: 3250 } },
  "Grade 7": { group: [1330, 735, 735], oneToOne: [1690, 1005, 1005], installment: { group: 2800, oneToOne: 3700 }, lumpsum: { group: 2500, oneToOne: 3250 } },
  "Grade 8": { group: [1330, 735, 735], oneToOne: [1690, 1005, 1005], installment: { group: 2800, oneToOne: 3700 }, lumpsum: { group: 2500, oneToOne: 3250 } },
  "Grade 9": { group: [1810, 1095, 1095], oneToOne: [2190, 1380, 1380], installment: { group: 4000, oneToOne: 4950 }, lumpsum: { group: 3700, oneToOne: 4550 } },
  "Grade 10": { group: [1810, 1095, 1095], oneToOne: [2190, 1380, 1380], installment: { group: 4000, oneToOne: 4950 }, lumpsum: { group: 3700, oneToOne: 4550 } },
  "Grade 11": { group: [1820, 1102.5, 1102.5], oneToOne: [2190, 1380, 1380], installment: { group: 4025, oneToOne: 4950 }, lumpsum: { group: 3725, oneToOne: 4550 } },
  "Grade 12": { group: [1830, 1110, 1110], oneToOne: [2190, 1380, 1380], installment: { group: 4050, oneToOne: 4950 }, lumpsum: { group: 3750, oneToOne: 4550 } },
};

const DUMMY_CLUB_ANNOUNCEMENT_POOL = [
  { name: "International Diplomats & Orators Society", category: "The Debate & MUN Club", focus: "debates, model UN, and confident public speaking" },
  { name: "International Literary Society", category: "The Book Club", focus: "reading circles, creative writing, and story discussions" },
  { name: "Viva de Lunaria Club", category: "The Art Club", focus: "painting, sketching, and creative challenges" },
  { name: "Ridmond Criminology Club", category: "The Criminology Club", focus: "case studies, observation, and critical thinking" },
  { name: "Music Club", category: "The Music Club", focus: "singing, rhythm, composition, and performance practice" },
  { name: "The Aurelian Club", category: "The STEM Club", focus: "science, technology, engineering, and math projects" },
];
const DUMMY_STUDENT_TIMEZONE = "America/New_York";
const ASSIGNMENT_KINDS = ["Homework", "Worksheet", "Practice Set", "Reading Assignment", "Project Task", "Quiz Preparation", "Lab Report", "Essay Draft"];
const ACTIVITY_ROWS = { K: 2, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2 };
const DUMMY_ACTIVITY_NAMES = ["Meet Your Classmates", "Creative Reading Circle", "Math Puzzle Challenge", "Science Discovery Lab", "Storytelling Workshop", "Art and Ideas Club", "Brain Games Hour", "Presentation Practice"];

const DEMO_PARAMS = ["demoDataId", "demoFeedUserId", "demoStudentName", "demoLearningProgram", "demoGradeId", "demoGradeName", "demoCourseId", "demoCourseName"];
const RECEIPT_STORAGE_KEY = "DUMMY_FEE_RECEIPT_DATA_BY_PAYMENT_ID";

// --- dates (legacy used moment: "MMM DD, YYYY", "hh:mm A") ---
const pad = (v) => (v < 10 ? `0${v}` : `${v}`);
const plusDays = (dt, days) => {
  const next = new Date(dt.getTime());
  next.setDate(next.getDate() + days);
  return next;
};
const plusMinutes = (dt, mins) => new Date(dt.getTime() + mins * 60000);
const plusMonths = (dt, months) => {
  const next = new Date(dt.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
};
const displayDateOnly = (dt) => dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
const displayTime = (dt) => dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
const backendDate = (dt) => `${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}-${dt.getFullYear()}`;
const fdate = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const fmt = (dt) => `${fdate(dt)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;

// Legacy seededNumber: a stable string hash, so "random" picks stay the same for one student and day.
function seededNumber(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

// --- course names ---
function normalizeCourseNameText(courseName) {
  return String(courseName || "")
    .replace(/\bv\d+(?:[._-]\d+)*\b/gi, " ")
    .replace(/\s*\((?:BUZZ(?:-[A-Z]+)?|GS|Honors?|Advanced|Standard|Regular)\)\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
function courseCategoryForName(cleaned) {
  const name = String(cleaned || "").toLowerCase();
  if (/(english|language\s*arts|reading|writing|literature)/i.test(name)) return "Language Arts";
  if (/(math|algebra|geometry|calculus|trigonometry|statistics|pre-?calculus|pre-?algebra)/i.test(name)) return "Mathematics";
  if (/(science|biology|physics|chemistry|environmental|earth|space|marine|anatomy|physiology)/i.test(name)) return "Science";
  if (/(technology|computer|coding|programming|cybersecurity|information\s*technology|multimedia|web)/i.test(name)) return "Technology";
  if (/(fine\s*arts?|visual\s*arts?|painting|drawing|music|theatre|drama|graphic\s*design)/i.test(name)) return "Art";
  if (/(history|geography|social\s*studies|social\s*science|government|civics|economics|political)/i.test(name)) return "Social Studies";
  if (/(physical\s*education|physical\s*fitness|\bpe\b|health)/i.test(name)) return "Physical Education";
  return cleaned;
}
const cleanCourseName = (courseName) => courseCategoryForName(normalizeCourseNameText(courseName));

function subjectIconForCourseName(courseName) {
  const name = String(courseName || "").toLowerCase();
  if (name.includes("spanish")) return "spanish.jpg";
  if (name.includes("world history")) return "World History.jpg";
  if (name.includes("history")) return "History.jpg";
  if (/math|algebra|geometry|calculus|statistics|trigonometry/.test(name)) return "Mathematics.jpg";
  if (/science|biology|physics|chemistry/.test(name)) return "Science.jpg";
  if (name.includes("english") || name.includes("language arts")) return "English.jpg";
  if (name.includes("physical education") || name.includes(" pe ")) return "Physical education.jpg";
  if (name.includes("computer") || name.includes("technology")) return "computer-science.jpg";
  if (name.includes("economics")) return "Economics.jpg";
  return "World History.jpg";
}

const safeTeacherName = (value) => {
  const name = String(value == null ? "" : value).trim();
  return name && !["undefined", "null"].includes(name.toLowerCase()) ? name : "";
};
const splitValues = (value, map) => String(value || "").split(",").map(map).filter(Boolean);

function isOneToOneLearningProgram(value) {
  const program = String(value || "").trim().toUpperCase();
  if (!program || program.includes("FLEX")) return false;
  return program === "ONE_TO_ONE" || program.includes("ONE TO ONE") || program.includes("ONE-TO-ONE");
}

function gradeKeyByStandardId(id) {
  const value = String(id || "").trim();
  return Object.keys(GRADE_CONFIG).find((key) => String(GRADE_CONFIG[key].standardId) === value) || "";
}
function gradeKeyByLabel(label) {
  const value = String(label || "").trim().toUpperCase();
  if (!value) return "";
  if (["K", "KG", "GRADE K", "KINDERGARTEN"].includes(value)) return "K";
  const match = value.match(/(?:GRADE\s*)?(\d{1,2})/);
  return match && GRADE_CONFIG[match[1]] ? match[1] : "";
}

/**
 * One dummy student. `row` = the demo-data row (or null), `params` = URLSearchParams of the page,
 * `fallbackName` = the logged-in user's name (legacy USER_FULL_NAME) when no demo name is known.
 */
export function createDummyStudent({ row = null, params = new URLSearchParams(), fallbackName = "", receiptBaseUrl = "", imageBaseUrl = "" } = {}) {
  const param = (name) => params.get(name) || "";

  // Legacy keeps only the demo row matching ?demoCourseId / ?demoCourseName (matchesSelectedDemoCourse).
  const courseIdFilter = param("demoCourseId").trim();
  const courseNameFilter = cleanCourseName(param("demoCourseName"));
  const rowMatches =
    row &&
    ((!courseIdFilter && !courseNameFilter) ||
      (courseIdFilter && (String(row.courseId || "").trim() === courseIdFilter || cleanCourseName(row.courseName) === cleanCourseName(courseIdFilter))) ||
      (courseNameFilter && (cleanCourseName(row.courseName) === courseNameFilter || String(row.courseId || "").trim() === courseNameFilter)));
  const dbRow = rowMatches ? row : null;
  const hasDemoContext = DEMO_PARAMS.some((name) => param(name));

  function baseDate() {
    const value = param("dummyDate");
    const now = new Date();
    if (!value) return now;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? now : parsed;
  }

  const dbGradeKey = dbRow ? gradeKeyByStandardId(dbRow.gradeId) || gradeKeyByLabel(dbRow.gradeName) : "";
  const gradeKey =
    dbGradeKey ||
    gradeKeyByStandardId(param("dummyStandardId")) ||
    gradeKeyByStandardId(param("standardId")) ||
    gradeKeyByLabel(param("dummyGrade")) ||
    gradeKeyByLabel(param("grade")) ||
    "K";
  const grade = GRADE_CONFIG[gradeKey] || GRADE_CONFIG.K;
  const offset = Math.max(0, GRADE_KEYS.indexOf(gradeKey));
  const isElementary = ["K", "1", "2", "3", "4", "5"].includes(gradeKey);
  const uid = 9000001 + offset;

  function subjects() {
    if (dbRow) {
      const keepExact = !isElementary;
      const courseNames = splitValues(dbRow.courseName, (item) => (keepExact ? normalizeCourseNameText(item) : cleanCourseName(item)));
      const courseIds = splitValues(dbRow.courseId, (item) => (keepExact ? normalizeCourseNameText(item) : cleanCourseName(item)));
      const rowTeachers = isOneToOneLearningProgram(dbRow.learningProgram || dbRow.learningProgramName)
        ? splitValues(dbRow.teacherName || dbRow.teacherFullName || dbRow.classTeacherName || dbRow.name, safeTeacherName)
        : [];
      const seen = new Set();
      const rows = [];
      courseNames.forEach((courseName, index) => {
        if (seen.has(courseName.toLowerCase())) return;
        seen.add(courseName.toLowerCase());
        const rawCourseId = courseIds[index] || courseName;
        const teacherName = rowTeachers[index] || rowTeachers[0] || "";
        rows.push({
          subjectId: parseInt(rawCourseId, 10) || 9300001 + index,
          subjectCode: String(rawCourseId),
          subjectName: courseName,
          subjectIcon: subjectIconForCourseName(courseName),
          teachers: teacherName ? [teacherName] : [0, 1, 2].map((n) => TEACHERS[(index * 2 + n) % TEACHERS.length]),
        });
      });
      if (rows.length) return rows;
    }
    if (hasDemoContext) return [];
    return (SUBJECT_ROWS[gradeKey] || SUBJECT_ROWS.K).map(([code, name, icon], index) => ({
      subjectId: 9300001 + offset * 100 + index,
      subjectCode: `G${gradeKey}-${code}`,
      subjectName: name,
      subjectIcon: icon,
      teachers: [0, 1, 2].map((n) => TEACHERS[(index * 2 + offset + n) % TEACHERS.length]),
    }));
  }

  function teacher(subject, index) {
    const teachers = (subject?.teachers || []).map(safeTeacherName).filter(Boolean);
    return teachers.length ? teachers[index % teachers.length] : TEACHERS[index % TEACHERS.length];
  }

  const userName = () => safeTeacherName(dbRow?.studentName) || param("demoStudentName") || fallbackName || "Demo Student";

  // --- My Log in History (legacy dummyStudentLoginHistoryResponse) ---
  function loginHistory() {
    const base = baseDate();
    const rows = [
      { start: plusMinutes(base, -95), end: plusMinutes(base, -45), duration: "50 mins" },
      { start: plusDays(base, -1), end: plusMinutes(plusDays(base, -1), 42), duration: "42 mins" },
      { start: plusDays(base, -2), end: plusMinutes(plusDays(base, -2), 55), duration: "55 mins" },
      { start: plusDays(base, -4), end: plusMinutes(plusDays(base, -4), 38), duration: "38 mins" },
    ];
    const loginHistories = rows.map((session) => ({
      loginTime: `${displayDateOnly(session.start)} ${displayTime(session.start)}`,
      logOutTime: `${displayDateOnly(session.end)} ${displayTime(session.end)}`,
      loginLocation: "New York, United States",
      totalLoginDuretion: session.duration,
    }));
    return {
      status: "1",
      statusCode: "S001",
      message: "Dummy student login history success",
      details: {
        studentName: userName(),
        firstLogin: loginHistories[loginHistories.length - 1].loginTime,
        lastLogin: loginHistories[0].loginTime,
        duration: loginHistories[0].totalLoginDuretion,
        totalLoginDuretion: "3 hrs 5 mins",
        loginHistories,
      },
    };
  }

  // --- My Fee Details (legacy getDummyStudentFeeDetailsResponse) ---
  function feePlan() {
    const gradeName = gradeKey === "K" ? "Kindergarten" : `Grade ${parseInt(gradeKey, 10)}`;
    const structure = FEE_STRUCTURE[gradeName] || FEE_STRUCTURE["Grade 5"];
    const program = (param("demoLearningProgramName") || param("demoLearningProgram")).toLowerCase();
    const programKey = program.includes("group") || program.includes("batch") ? "group" : "oneToOne";
    return { gradeName, lumpsumTotal: structure.lumpsum[programKey] };
  }

  // The receipt is the backend's static dummy-parent-fee-receipt.html, which reads its data from
  // localStorage by payment id — same origin as this app when the backend is proxied (local proxy).
  function saveReceipt(payment, paidOn, plan) {
    const digits = String(payment.id);
    const datePart = `${String(paidOn.date.getFullYear()).slice(2)}${pad(paidOn.date.getMonth() + 1)}${pad(paidOn.date.getDate())}`;
    const receipt = {
      studentName: userName(),
      studentCode: `US${String(uid).slice(-9)}`,
      countryCity: "United States | New York",
      learningPlan: param("demoLearningProgramName") || param("demoLearningProgram") || "One-to-One Learning",
      grade: plan.gradeName,
      parentName: userName(),
      location: "United States, New York",
      feeFor: payment.paymentName,
      receiptNo: `REF${datePart}${digits.slice(0, 4)}_${digits.slice(-5)}`,
      paidOn: paidOn.text,
      totalFee: payment.totalFeeWithMaterialFee,
      feeAmount: payment.totalFeeWithMaterialFee,
      courses: subjects().map((subject) => `${cleanCourseName(subject.subjectName || "Course")} (1.0 Credit)`),
      schedule: [[payment.paymentName, payment.totalFeeWithMaterialFee, "RECEIVED"]],
    };
    try {
      const receipts = JSON.parse(window.localStorage.getItem(RECEIPT_STORAGE_KEY) || "{}");
      receipts[String(payment.id)] = receipt;
      window.localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipts));
    } catch {
      // storage unavailable (private mode): the receipt page falls back to its own defaults
    }
  }

  function feeDetails() {
    const base = baseDate();
    const plan = feePlan();
    const paidDate = plusMonths(base, -1);
    const paidDateText = displayDateOnly(paidDate);
    const paidOnText = `${paidDateText} 11:00 AM`;
    const paymentId = 970001 + uid;
    const courseFeePayment = {
      id: paymentId,
      scheduledPayDate: paidDateText,
      standardName: plan.gradeName,
      paymentName: `${plan.gradeName} - 1st of 3 Months Installment`,
      totalFeeWithMaterialFee: plan.lumpsumTotal,
      payAmount: plan.lumpsumTotal,
      payDate: paidDateText,
      status: "SUCCESS",
      dummyStatusLabel: "PAID",
      paymentTitle: "TUITION_FEE",
      paymentTransferType: 1,
      pgName: "Stripe",
      recieptLink: `${receiptBaseUrl}/static/theme2/dummy-parent-fee-receipt.html?studentId=${uid}&paymentId=${paymentId}&paidOn=${encodeURIComponent(paidOnText)}`,
    };
    saveReceipt(courseFeePayment, { date: paidDate, text: paidOnText }, plan);
    return {
      status: 1,
      details: {
        nextUserPaymentDetailsId: 0,
        userPaymentDetailsList: [
          {
            id: 970000 + uid,
            scheduledPayDate: displayDateOnly(plusDays(base, 13)),
            standardName: plan.gradeName,
            paymentName: "Graduation Ceremony 2026 | Dubai",
            totalFeeWithMaterialFee: 600,
            payAmount: 600,
            payDate: "",
            status: "SCHEDULED",
            paymentTitle: "GRADUATION_CEREMONY_FEE",
            paymentTransferType: 1,
            pgName: "Stripe",
            recieptLink: "",
          },
          courseFeePayment,
        ],
      },
    };
  }

  // --- My Performance (legacy dummyAcademicPerformanceRows / ProgressDetail / GradeHistory) ---
  function academicPerformanceRows() {
    const base = baseDate();
    const endDate = plusMonths(base, 9);
    return subjects().map((subject, i) => ({
      lmsEnrollmentId: `DUMMY-STUDENT-ENROLL-${uid}-${i + 1}`,
      lmsCourseId: String(subject.subjectId || `DUMMY-STUDENT-COURSE-${i + 1}`),
      courseName: cleanCourseName(subject.subjectName || `Course ${i + 1}`),
      score: i === 1 ? 100 : i % 3 === 0 ? 0 : 82 + i,
      progressPace: i % 4 === 2 ? "GettingStarted" : "OnTrack",
      teacherName: teacher(subject, i),
      teacherGender: i % 2 === 0 ? "FEMALE" : "MALE",
      endDate: displayDateOnly(endDate),
      remainingDays: Math.max(1, Math.ceil((endDate - new Date()) / 86400000)),
      pendingAssignment: i === 2 ? 3 : i % 2,
      progressGradable: Math.min(100, i === 0 ? 0 : 4 + i * 2),
      progressAllActivity: Math.min(100, 3 + i * 2),
    }));
  }

  const academicPerformance = () => ({ status: 1, details: { courseProviderId: 37, studentAcademicPerformances: academicPerformanceRows() } });

  function academicProgressDetail(lmsEnrollmentId, lmsCourseId) {
    const rows = academicPerformanceRows();
    const course =
      rows.find((r) => String(r.lmsEnrollmentId) === String(lmsEnrollmentId) || String(r.lmsCourseId) === String(lmsCourseId)) || rows[0] || {};
    const base = baseDate();
    const totalAssignment = 8;
    const pendingAssign = parseInt(course.pendingAssignment || 0, 10);
    const submitted = Math.max(0, totalAssignment - pendingAssign - 1);
    const score = Number(course.score || 0);
    const items = Array.from({ length: totalAssignment }, (_, i) => {
      const status = i < submitted ? "SUBMITTED" : i === submitted ? "EXCUSED" : "";
      return {
        itemid: `DUMMY-STUDENT-ITEM-${i + 1}`,
        title: `${course.courseName} Assignment ${i + 1}`,
        duedate: displayDateOnly(plusDays(base, i * 5)),
        submitteddate: status === "SUBMITTED" ? displayDateOnly(plusDays(base, i * 5 - 1)) : "N/A",
        unitTimeSpent: `00:${pad(24 + i)}:00`,
        submissionStatus: status,
        lateTime: "",
        status,
        unitPercent: Math.min(100, score + (i % 3)),
        letter: score >= 90 ? "A" : "B",
        teacherGradeStatus: status === "SUBMITTED" ? "Y" : "N",
        colorDueText: "",
        colorScoreText: "text-success",
      };
    });
    return {
      code: "SUCCESS",
      totalAssignment,
      excusedAssign: 1,
      submiteAssign: submitted,
      upcomingAssign: pendingAssign,
      pendingAssign,
      passesAssign: submitted,
      failedAssign: 0,
      submitBeforeTimeAssign: Math.max(0, submitted - 1),
      submitOntimeAssign: submitted > 0 ? 1 : 0,
      submitLateAssign: 0,
      response: {
        enrollments: {
          enrollment: [
            {
              id: lmsEnrollmentId,
              startdate: displayDateOnly(plusMonths(base, -1)),
              enddate: course.endDate || displayDateOnly(plusMonths(base, 9)),
              entity: { title: course.courseName || "Course" },
              grades: {
                percentage: score,
                letter: score >= 90 ? "A" : "B",
                complete: course.progressGradable || 0,
                completedgradable: submitted,
                gradable: totalAssignment,
                completeall: course.progressAllActivity || 0,
                completed: submitted + 2,
                completable: totalAssignment + 2,
                items: { item: items },
              },
            },
          ],
        },
      },
    };
  }

  function academicGradeHistory(itemId) {
    const base = baseDate();
    const firstName = userName().split(" ")[0] || "Demo";
    const grades = [0, 1, 2].map((i) => ({
      lastactivitydate: displayDateOnly(plusDays(base, -i - 1)),
      attempts: i + 1,
      expTime: `00:${pad(18 + i * 4)}:00`,
      achieved: 88 + i,
      possible: 100,
      percent: `${88 + i}%`,
      user: { firstname: firstName, lastname: "Student" },
    }));
    return { code: "SUCCESS", response: { grades: { grade: grades } }, itemId };
  }

  // --- My Progress Reports (legacy dummyStudentProgressReports / ProgressReportHtml) ---
  const PROGRESS_REPORT_SCHEME = "dummy-student-progress-report://";

  function progressReports() {
    const base = baseDate();
    const rows = [0, 1].map((i) => {
      const reportEnd = plusDays(base, -(i * 7) - 3);
      const reportStart = plusDays(reportEnd, -6);
      return {
        weeklyReportId: `DUMMY-REPORT-${i + 1}`,
        daysType: 7,
        reportStartDate: displayDateOnly(reportStart),
        reportEndDate: displayDateOnly(reportEnd),
        createdDate: displayDateOnly(plusDays(reportEnd, 1)),
        playloadUrl: `${PROGRESS_REPORT_SCHEME}${i + 1}`,
      };
    });
    return { status: 1, details: { studentWeeklyProgressReports: rows } };
  }

  /**
   * The gradebook report as the get-user-gradebook format=json response (legacy built the same
   * content as HTML). `range` = optional { start, end } Dates from the report's date search.
   */
  function progressReport(url, range) {
    const match = String(url || "").match(/dummy-student-progress-report:\/\/(\d+)/);
    const reportIndex = match ? parseInt(match[1], 10) || 1 : 1;
    const base = baseDate();
    const reportEnd = range?.end || plusDays(base, -((reportIndex - 1) * 7) - 3);
    const reportStart = range?.start || plusDays(reportEnd, -6);
    const gradebookEnroll = subjects().map((subject, index) => {
      const score = index === 1 ? 100 : index % 3 === 0 ? 90 : 84 + index;
      const items = [0, 1, 2, 3].map((i) => {
        const percent = Math.min(100, score + (i % 2));
        return {
          itemid: `DUMMY-REPORT-ITEM-${index + 1}-${i + 1}`,
          unit: `${pad(i + 1)}.00`,
          unitType: i % 2 === 0 ? "QUIZ" : "ASSIGNMENT",
          unitTitle: `${cleanCourseName(subject.subjectName)} Activity ${i + 1}`,
          unitTimeSpent: `0:${pad(18 + i * 4)}:00`,
          duedate: displayDateOnly(plusDays(reportStart, i + 2)),
          submitteddate: displayDateOnly(plusDays(reportStart, i + 1)),
          unitPercent: `${percent}%`,
          letter: percent >= 90 ? "A-" : "B",
          colorScoreText: "",
        };
      });
      return {
        id: `DUMMY-STUDENT-ENROLL-${uid}-${index + 1}`,
        startdate: displayDateOnly(plusMonths(base, -1)),
        enddate: displayDateOnly(plusMonths(base, 9)),
        entity: { title: cleanCourseName(subject.subjectName) },
        teacherName: teacher(subject, index),
        grades: {
          unitStatus: false,
          items: { item: items },
          totalDays: "02:32:00",
          submiteActivityGrade: 4,
          activityWaitingForGrade: 0,
          activityNotSubmited: 0,
          lastSubmissionDate: items[items.length - 1].submitteddate,
          lastsubmissionName: items[items.length - 1].unitTitle,
          letter: score >= 90 ? "A" : "B",
          percentage: `${score}%`,
          percentWeekly: `${Math.min(100, score + 2)}%`,
          complete: `${Math.min(100, 72 + index * 6)}%`,
        },
      };
    });
    return {
      status: "SUCCESS",
      reportMessage: "",
      lmsProId: "37",
      studentName: userName(),
      standardName: grade.label,
      rollNumber: `MEXDIDI${260600000 + uid}`,
      country: "Mexico",
      startdate: backendDate(reportStart),
      enddate: backendDate(reportEnd),
      reportStartDate: displayDateOnly(reportStart),
      reportEndDate: displayDateOnly(reportEnd),
      subReportType: "weekly",
      downloadUrl: "",
      gradebookEnroll,
    };
  }

  const img = (subject) => `${imageBaseUrl}subjects/${subject.subjectIcon}`;
  const cleanSubjectName = (name) => String(name || "").replace(/ Grade K$/i, "").replace(/ Grade \d+$/i, "");
  const teacherNameWithoutHonorific = (value) => safeTeacherName(value).replace(/^(Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?)\s+/i, "");
  // Legacy dummyRandomSeed.
  const randomSeed = () => `${uid}|${gradeKey}|${userName()}|${fdate(baseDate())}`;

  // --- Today's classes (legacy dummyStudentScheduleResponse; feeds attendance + diary) ---
  function schedule() {
    const base = baseDate();
    let list = subjects();
    if (!list.length) {
      list = (SUBJECT_ROWS[gradeKey] || SUBJECT_ROWS.K).map(([code, name, icon], index) => ({
        subjectId: 9300001 + offset * 100 + index,
        subjectCode: `G${gradeKey}-${code}`,
        subjectName: name,
        subjectIcon: icon,
        teachers: [0, 1].map((n) => TEACHERS[(index * 2 + offset + n) % TEACHERS.length]),
      }));
    }
    // The demo admin form saves classCount as 0, which means "use the default" (3), capped at 5.
    const classCount = Math.max(3, Math.min(parseInt(dbRow?.classCount, 10) || 3, 5));
    const rows = list.slice(0, classCount).map((subject, i) => {
      const start = i === 0 ? plusMinutes(base, -15) : new Date(base.getFullYear(), base.getMonth(), base.getDate(), 10 + i * 2, 0, 0);
      const courseName = cleanSubjectName(subject.subjectName || "Demo Class");
      const teacherName = safeTeacherName(teacher(subject, i)) || "Teacher";
      return {
        id: `dummy-student-schedule-${i + 1}`,
        title: courseName,
        eventTitle: courseName,
        courseName,
        subjectName: courseName,
        start: fmt(start),
        end: fmt(plusMinutes(start, 90)),
        timezone: DUMMY_STUDENT_TIMEZONE,
        classStatus: i === 0 ? "Live" : "Upcoming",
        eventType: "ONE_TO_ONE",
        category: "CLASS",
        icon: img(subject),
        url: `dummy-student-class://dummy-student-schedule-${i + 1}`,
        grade: grade.label,
        session: i === 0 ? "Live Demo" : "Demo",
        salutation: "",
        name: teacherName,
        teacherName,
        teacherFullName: teacherName,
        classTeacherName: teacherName,
        meetingTeacherName: teacherName,
        teacherNames: [teacherName],
      };
    });
    return { status: "1", statusCode: "S001", message: "Dummy student schedule success", details: { schedule: rows } };
  }

  // --- Announcements (legacy dummyAnnouncements: 2 grade notices + seeded club announcements) ---
  function dummyAnnouncement(id, title, date, remark, unread, timeLabel = "") {
    return {
      announcementId: id,
      announceId: id,
      announceTitle: title,
      createdDate: fmt(date),
      timeLabel,
      replyStatus: unread ? "N" : "Y",
      // seenStatus is the real API's field the Next.js "New" badge reads.
      seenStatus: unread ? "N" : "Y",
      latestStatus: unread ? "Y" : "N",
      latestStstus: unread ? "Y" : "N",
      userId: uid,
      moduleId: 58,
      teacherRemark: remark,
      fileType: "",
      attachment: "",
    };
  }

  function announcementRows() {
    const base = baseDate();
    const rows = [
      dummyAnnouncement(700001 + offset, `Welcome to ${grade.label}`, base, `Welcome to your ${grade.label} demo dashboard. Please review your class schedule and join your live class on time.`, true),
      dummyAnnouncement(700101 + offset, "Class Readiness Reminder", plusDays(base, -1), "Keep your notebook, pencils, and learning materials ready before every online class.", true),
    ];
    // Seeded shuffle of the club pool (legacy dummyClubSelection).
    const clubs = DUMMY_CLUB_ANNOUNCEMENT_POOL.slice();
    let seed = seededNumber(randomSeed());
    for (let i = clubs.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = seed % (i + 1);
      [clubs[i], clubs[j]] = [clubs[j], clubs[i]];
    }
    const upcomingCount = (seededNumber(`${randomSeed()}|upcoming`) % 2) + 1;
    const clubDate = (daysOffset, hour) => {
      const date = plusDays(base, daysOffset);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0);
    };
    const clubAnnouncement = (club, index, date, upcoming) => {
      const dateText = displayDateOnly(date);
      const remark = upcoming
        ? `${club.name} is scheduled for ${dateText}. Join us for ${club.focus}.`
        : `${club.name} was held on ${dateText}. Students participated in ${club.focus}.`;
      const timeLabel = upcoming ? "upcoming" : index === upcomingCount + 1 ? "1 day ago" : "last week";
      return dummyAnnouncement(710000 + offset * 100 + index, `${club.category} ${upcoming ? "Upcoming" : "Held"}: ${club.name}`, date, remark, upcoming, timeLabel);
    };
    [3, 10].slice(0, upcomingCount).forEach((days, i) => rows.push(clubAnnouncement(clubs[i], i + 1, clubDate(days, 16 + i), true)));
    [-1, -8, -14].forEach((days, j) => rows.push(clubAnnouncement(clubs[j + upcomingCount], j + upcomingCount + 1, clubDate(days, 15 + j), false)));

    // Legacy announcementSequence: upcoming, 1 day ago, last week, then the rest.
    const sequence = (item) => {
      if (item.timeLabel === "upcoming") return 1;
      if (item.timeLabel === "1 day ago") return 2;
      if (item.timeLabel === "last week") return 3;
      const diffDays = Math.floor((base - new Date(item.createdDate.replace(" ", "T"))) / 86400000);
      if (diffDays < 0) return 1;
      if (diffDays === 1) return 2;
      if (diffDays >= 7) return 3;
      return 4;
    };
    return rows.sort((a, b) => sequence(a) - sequence(b));
  }

  function announcements() {
    const rows = announcementRows();
    return { status: "1", newAnnouncementCount: rows.filter((row) => row.replyStatus === "N").length, announcements: rows };
  }

  // --- News (legacy getDummyNewsList / getDummyNewsById) ---
  function newsList() {
    const base = baseDate();
    const rows = [
      [800001 + offset, `${grade.label} Learners Begin Their Demo Week`, `International Schooling welcomes ${grade.label} learners to a week of interactive online classes.`],
      [800101 + offset, "Simple Tips for Online Classroom Success", "Learners do best with a quiet study corner, a charged device, and a few minutes of preparation."],
    ];
    return {
      code: 200,
      totalNews: rows.length,
      list: rows.map(([id, title, content], i) => ({
        id,
        title,
        content,
        sourceName: "International Schooling",
        image: `${imageBaseUrl}waiting-page-school-demo.png`,
        sourceLogo: `${imageBaseUrl}waiting-page-school-demo-logo.png`,
        sourceUrl: "",
        publishDate: fmt(plusDays(base, -i)),
        country: "Global",
        readTime: 2,
      })),
    };
  }

  function newsById(id) {
    const article = newsList().list.find((item) => String(item.id) === String(id));
    return article ? { code: 200, data: article } : { code: 404, message: "News not found" };
  }

  // --- Student diary (legacy dummyStudentDiaryThreads / Messages / unread count) ---
  function diaryThreadRows() {
    const firstClass = schedule().details.schedule[0] || { courseName: "Language Arts", teacherName: "Olivia Parker" };
    const common = { studentUserId: String(uid), studentName: userName(), profilePic: "", learningProgram: param("demoLearningProgram") || "ONE_TO_ONE", threadStatus: "OPEN" };
    return [
      {
        ...common,
        threadId: `dummy-student-teacher-${uid}`,
        teacherName: teacherNameWithoutHonorific(firstClass.teacherName || "Olivia Parker"),
        teacherGender: "FEMALE",
        chatWithRole: "TEACHER",
        latestMessage: `Please revise today's ${firstClass.courseName || "Language Arts"} notes before the next class.`,
        unreadCount: 1,
      },
      {
        ...common,
        threadId: `dummy-student-school-${uid}`,
        teacherName: "School Office",
        teacherGender: "DONOTWANTTOSPECIFY",
        chatWithRole: "SCHOOL",
        latestMessage: "Your monthly progress review is available in the dashboard.",
        unreadCount: 0,
      },
    ];
  }

  const diaryThreads = () => ({ status: 1, details: { threads: diaryThreadRows() } });
  const diaryUnreadCount = () => ({ status: 1, details: { unreadThreadCount: 1, unreadMessageCount: 1 } });

  function diaryMessages(threadId) {
    const base = baseDate();
    const [teacherThread, schoolThread] = diaryThreadRows();
    const isSchoolThread = String(threadId) === String(schoolThread.threadId);
    const teacherName = teacherNameWithoutHonorific(teacherThread.teacherName || "Olivia Parker");
    const courseName = schedule().details.schedule[0]?.courseName || "Language Arts";
    const student = (id, message, days, mention) => ({
      id,
      senderRole: "STUDENT",
      senderName: userName(),
      senderUserId: uid,
      message,
      createdAt: plusDays(base, days).toISOString(),
      mentions: [mention],
    });
    const office = (id, message, days) => ({ id, senderRole: "SCHOOL", senderName: "School Office", senderGender: "DONOTWANTTOSPECIFY", message, createdAt: plusDays(base, days).toISOString(), mentions: [] });
    const tutor = (id, message, days) => ({
      id,
      senderRole: "TEACHER",
      senderName: teacherName,
      teacherName,
      teacherGender: teacherThread.teacherGender,
      senderGender: teacherThread.teacherGender,
      message,
      createdAt: plusDays(base, days).toISOString(),
      mentions: [],
    });
    const messages = isSchoolThread
      ? [
          office(`${schoolThread.threadId}-1`, `Hello ${userName()}, your monthly progress review is available in the dashboard. Please review it before Friday.`, -3),
          student(`${schoolThread.threadId}-2`, "Thank you. I will review the progress report today.", -2, { userName: "School Office", roleType: "SCHOOL" }),
          office(`${schoolThread.threadId}-3`, "Great. Your attendance record for this month is also updated.", -1),
        ]
      : [
          tutor(`${teacherThread.threadId}-1`, `Hi ${userName()}, you answered the comprehension questions well in today's class.`, -2),
          student(`${teacherThread.threadId}-2`, "Thank you. I will complete the worksheet before the next session.", -1, { userName: teacherName, roleType: "TEACHER" }),
          tutor(`${teacherThread.threadId}-3`, `Please revise today's ${courseName} notes before the next class and keep your notebook ready.`, 0),
        ];
    return {
      status: 1,
      details: { threadId, studentUserId: String(uid), sourceTimezone: DUMMY_STUDENT_TIMEZONE, threadStatus: "OPEN", courseName: isSchoolThread ? "" : courseName, messages },
    };
  }

  // --- Home calendar (legacy patchDummySchoolCalendar for the new dashboard calendar) ---
  const seededShuffle = (list, seedKey) => {
    const arr = list.slice();
    let seed = seededNumber(seedKey);
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const dayToDate = (day) => {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // The calendar keeps the demo row's exact course names (subjects() buckets them for icons/receipts).
  function assignmentCourses() {
    if (dbRow) {
      const ids = String(dbRow.courseId || "").split(",").map((s) => s.trim());
      const seen = new Set();
      const rows = [];
      String(dbRow.courseName || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name, idx) => {
          if (seen.has(name.toLowerCase())) return;
          seen.add(name.toLowerCase());
          rows.push({ subjectId: parseInt(ids[idx] || name, 10) || 9300001 + idx, subjectName: name, teachers: [] });
        });
      if (rows.length) return rows;
    }
    return subjects();
  }
  // Grade K-5: the calendar sticks to 3 stable random subjects (legacy dummySelectedThreeSubjects).
  function calendarCourses() {
    const courses = assignmentCourses();
    if (!isElementary || courses.length <= 3) return courses;
    return seededShuffle(courses, `${randomSeed()}|3subjects`).slice(0, 3);
  }

  const today = () => fdate(baseDate());

  function assignmentsForDay(day) {
    const dayDate = dayToDate(day);
    if (dayDate.getDay() === 0 || dayDate.getDay() === 6) return [];
    const isPast = day < today();
    return calendarCourses().map((course, ci) => {
      const isSubmitted = day === today() ? ci % 2 === 1 : isPast;
      const start = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 6 + ci, 0, 0);
      return {
        id: `dummy-assignment-${day}-${ci}`,
        category: "ASSIGNMENTS",
        eventTitle: null,
        title: `${course.subjectName} - ${ASSIGNMENT_KINDS[ci % ASSIGNMENT_KINDS.length]}`,
        courseId: course.subjectId,
        courseName: course.subjectName,
        subjectName: course.subjectName,
        dueDate: day,
        start: fmt(start),
        assignmentType: isSubmitted ? "submitted" : "",
        submittedDate: isSubmitted ? fdate(plusDays(dayDate, -1)) : "",
      };
    });
  }

  // Legacy: K-5 get at most 3 classes a week (today + up to 2 later weekdays; future weeks a seeded 3,
  // past weeks none); 6-12 get one class per weekday, rotating through the courses from a fixed Monday.
  function elementaryWeekSchedule(weekStart) {
    const courses = calendarCourses();
    const weekdays = [1, 2, 3, 4, 5].map((n) => fdate(plusDays(weekStart, n)));
    let chosen = [];
    if (weekdays.includes(today())) chosen = [today(), ...weekdays.filter((d) => d > today()).slice(0, 2)];
    else if (today() < weekdays[0]) chosen = seededShuffle(weekdays, `${randomSeed()}|week|${fdate(weekStart)}`).slice(0, 3).sort();
    return Object.fromEntries(chosen.map((day, idx) => [day, courses[idx % courses.length]]));
  }
  function businessDayIndex(day) {
    const diffDays = Math.round((dayToDate(day) - new Date(2000, 0, 3)) / 86400000); // 2000-01-03 was a Monday
    return Math.floor(diffDays / 7) * 5 + Math.min(Math.max(diffDays % 7, 0), 4);
  }
  function classesForDay(day) {
    const dayDate = dayToDate(day);
    if (dayDate.getDay() === 0 || dayDate.getDay() === 6) return [];
    let course;
    if (isElementary) {
      course = elementaryWeekSchedule(plusDays(dayDate, -dayDate.getDay()))[day];
    } else {
      const courses = assignmentCourses();
      course = courses.length ? courses[businessDayIndex(day) % courses.length] : null;
    }
    if (!course) return [];
    const start = day === today() ? plusMinutes(baseDate(), -15) : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 9, 0, 0);
    const teacherName = safeTeacherName(teacher(course, 0)) || "Teacher";
    return [
      {
        id: `dummy-class-${day}`,
        category: "CLASS",
        eventTitle: course.subjectName,
        title: "",
        courseName: course.subjectName,
        subjectName: course.subjectName,
        courseId: course.subjectId,
        subjectId: course.subjectId,
        start: fmt(start),
        end: fmt(plusMinutes(start, 90)),
        eventType: "ONE_TO_ONE",
        salutation: "",
        name: teacherName,
        teacherName,
        teacherFullName: teacherName,
        classTeacherName: teacherName,
        meetingTeacherName: teacherName,
        teacherNames: [teacherName],
      },
    ];
  }

  function holidayForDay(day) {
    const year = baseDate().getFullYear();
    const holidays = [
      { name: "Eid al-Adha (Bakra Eid)", start: `${year}-05-26`, end: `${year}-05-28` },
      { name: "Independence Day", start: `${year}-07-04`, end: `${year}-07-04` },
      { name: "Thanksgiving Break", start: `${year}-11-26`, end: `${year}-11-27` },
      { name: "Winter Break", start: `${year}-12-24`, end: `${year + 1}-01-01` },
    ];
    return holidays.find((holiday) => day >= holiday.start && day <= holiday.end) || null;
  }

  // Activities: one a day from today on the next weekdays that aren't holidays, `activityCount` in all
  // (demo row) or 2 per grade without one; none with demo URL params but no row (legacy activityNames).
  function activitySchedule() {
    let count = ACTIVITY_ROWS[gradeKey] || 2;
    if (dbRow) count = Math.max(0, parseInt(dbRow.activityCount, 10) || 0);
    else if (hasDemoContext) count = 0;
    const names = Array.from({ length: count }, (_, i) => seededShuffle(DUMMY_ACTIVITY_NAMES, `${randomSeed()}|activities`)[i % DUMMY_ACTIVITY_NAMES.length]);
    const schedule = {};
    let cursor = dayToDate(today());
    for (let placed = 0, guard = 0; placed < names.length && guard < 120; guard++) {
      const day = fdate(cursor);
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6 && !holidayForDay(day)) schedule[day] = names[placed++];
      cursor = plusDays(cursor, 1);
    }
    return schedule;
  }

  /**
   * The school-calendar response (SchoolCalendarDTO) for [startDate, endDate] ("yyyy-MM-dd"). Event times
   * are tagged with `timezone` (the viewer's), so "now" classes stay at the viewer's current time.
   */
  function calendar({ startDate, endDate, timezone }) {
    const activities = activitySchedule();
    const events = [];
    for (let cursor = dayToDate(startDate), n = 0; fdate(cursor) <= endDate && n < 60; cursor = plusDays(cursor, 1), n++) {
      const day = fdate(cursor);
      const holiday = holidayForDay(day);
      events.push(...assignmentsForDay(day));
      if (holiday) {
        events.push({ id: `dummy-holiday-${day}`, category: "HOLIDAY", eventTitle: holiday.name, title: holiday.name, start: day, allDay: true });
      } else {
        events.push(...classesForDay(day));
        if (activities[day]) {
          const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 15, 0, 0);
          events.push({ id: `dummy-activity-${day}`, category: "ACTIVITY", eventTitle: activities[day], title: activities[day], start: fmt(start), end: fmt(plusMinutes(start, 45)) });
        }
      }
    }
    return {
      status: "1",
      event: events.map((event) => (event.allDay ? event : { ...event, timezone })),
      courseDetails: calendarCourses().map((course) => ({ courseId: course.subjectId, courseName: course.subjectName })),
      holidays: [],
    };
  }

  // --- Home dashboard orchestrator calls (legacy getDummyGradeKDashboardOrMigrationSection / Details) ---
  // Every popup flag is off, so a demo never opens graduation / course-selection / training modals.
  function dashboardOrMigration() {
    return {
      status: "1",
      statusCode: "S001",
      userId: uid,
      standardId: grade.standardId,
      userName: userName(),
      email: "demo.student@test.local",
      studentGraduate: "N",
      showStudentCourseSelectionModel: "N",
      showBatchImpAnnouncementModal: "N",
      showAcademicYearSelectionModel: "N",
      showSystemTrainingSelectionModel: "N",
      registrationType: "ONE_TO_ONE",
      showGraduationCeremonyPopup: "N",
      graduationCeremonyRegistrationDeadline: "",
      showBatchReEnrollmentPopUp: "N",
    };
  }
  function dashboardDetails() {
    return {
      status: "1",
      statusCode: "S001",
      userId: uid,
      userRole: "STUDENT",
      userName: userName(),
      standardId: grade.standardId,
      email: "demo.student@test.local",
      videoUrl: "N",
      registrationType: "ONE_TO_ONE",
      showGraduationCeremonyPopup: "N",
      graduationCeremonyRegistrationDeadline: "",
    };
  }

  // --- Book Classes (legacy getDummyBookAClassResponse ... getDummyStudentBookClassSubmitResponse) ---
  const studentStandardId = 9200001 + offset;
  const bookClassDefaultCount = isElementary ? 3 : 1;
  // The demo admin form saves classCount 0 = "use the default".
  const configuredClassCount = (fallback) => (dbRow ? parseInt(dbRow.classCount, 10) || fallback : fallback);
  const subjectById = (subjectId) =>
    subjects().find((s) => String(s.subjectId) === String(subjectId)) || subjects()[0] || { subjectId: 0, subjectName: "", subjectIcon: "World History.jpg", teachers: [] };

  function bookClassSubjectRows() {
    return subjects().map((subject, i) => {
      const total = configuredClassCount(12);
      const booked = Math.min(total, i % 2);
      const completed = Math.min(Math.max(total - booked, 0), i % 3);
      const rescheduled = total > 1 && i === 1 ? 1 : 0;
      const missedByTeacher = total > 2 && i === 2 ? 1 : 0;
      return {
        img: img(subject),
        assignedTeacherCount: 1,
        name: subject.subjectName,
        subjectId: subject.subjectId,
        studentStandardId,
        teacherName: teacher(subject, i),
        total,
        booked,
        completed,
        rescheduled,
        missedByYou: 0,
        missedByTeacher,
        expired: 0,
        left: total - booked - completed - rescheduled - missedByTeacher,
        complimentaryTotal: 2,
        extraClassTotal: 10,
        weekLeftClass: isElementary ? 3 : 1,
      };
    });
  }

  const bookAClass = () => ({
    status: "1",
    statusCode: "S001",
    message: "Book a Class",
    details: { studentStandardId, showAcademicYearValidation: "N", classPlanCount: configuredClassCount(bookClassDefaultCount) },
  });

  function bookClassDetails() {
    const rows = bookClassSubjectRows();
    const perWeek = isElementary ? 3 : rows.length || 1;
    const perYear = perWeek * 42;
    return {
      status: "1",
      statusCode: "S001",
      message: "data fetched successfully",
      classData: {
        year: [{ comp: perYear, plan: 0, extra: 120, bookedComp: Math.min(perYear, 1), bookedExtra: 0, leftExtra: 120, leftComp: Math.max(perYear - 1, 0), expiredComp: 0, expiredExtra: 0 }],
        week: [{ comp: perWeek, plan: 0, extra: 6, bookedComp: 0, bookedExtra: 0, leftExtra: 6, leftComp: perWeek, expiredComp: 0, expiredExtra: 0 }],
      },
      registerType: "ONE_TO_ONE",
      compClassPerweek: perWeek,
      compClassYear: perYear,
      subjectList: rows,
    };
  }

  function assignedTeacher(subjectId) {
    const subject = subjectById(subjectId);
    return {
      status: "1",
      statusCode: "EX01",
      subjectName: subject.subjectName,
      standardId: grade.standardId,
      registerType: "ONE_TO_ONE",
      subjectId: subject.subjectId,
      teacherName: teacher(subject, 0),
      assignedTeacherId: 8800001 + offset,
      assignedTeacherUserId: 8900001 + offset,
      studentUserId: uid,
      studentStandardId,
      studentTimeZone: DUMMY_STUDENT_TIMEZONE,
      teacherAssigned: "YES",
    };
  }

  // "All Courses" card: legacy has no dummy for it, so list every course with its dummy teacher.
  const assignedTeachersForAllCourses = () => ({
    status: "1",
    studentSubjectList: subjects().map((subject) => {
      const { subjectId, subjectName, teacherName, assignedTeacherUserId, teacherAssigned } = assignedTeacher(subject.subjectId);
      return { subjectId, subjectName, teacherName, assignedTeacherUserId, teacherAssigned };
    }),
  });

  // Slots at 9, 11 and 15 h for the 7 days from Sunday of `selectedDate`'s week; Tuesday 11:00 is booked.
  function teacherWeeklyCalendar(teacherUserId, subjectId, selectedDate) {
    const start = selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime()) ? selectedDate : baseDate();
    const weekStart = plusDays(new Date(start.getFullYear(), start.getMonth(), start.getDate()), -start.getDay());
    const subject = subjectById(subjectId);
    const days = Array.from({ length: 7 }, (_, d) => {
      const day = plusDays(weekStart, d);
      return {
        displayStartDate: day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", year: "numeric" }),
        displayStartDateWithoutDay: displayDateOnly(day),
        dayWiseAllData: [9, 11, 15].map((hour, h) => {
          const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0);
          const slotEnd = plusMinutes(slotStart, 45);
          return {
            status: d === 2 && h === 1 ? "Booked" : "Available",
            bookedDate: fdate(day),
            bookedStartDate: fmt(slotStart),
            bookedEndDate: fmt(slotEnd),
            displayStartTime: displayTime(slotStart),
            displayEndTime: displayTime(slotEnd),
          };
        }),
      };
    });
    return {
      status: "1",
      statusCode: "S001",
      teacherUserId: teacherUserId || 8900001 + offset,
      teacherName: teacher(subject, 0),
      subjectName: subject.subjectName,
      timeZoneName: DUMMY_STUDENT_TIMEZONE,
      showSlotAfter: 0,
      skipDateList: [],
      classDuration: 45,
      // The real response's shape: one week holding all 7 days (legacy dummy split them per week entry).
      teacherWeeklyTimeCurrLiveClass: {
        teacherAssignTimeWeekList: [
          { weeklyStartDateStandardFormat: fdate(weekStart), weeklyEndDateStandardFormat: fdate(plusDays(weekStart, 6)), teacherAllDataInOneList: days },
        ],
      },
      teacherWeeklyTimeNextLiveClass: null,
    };
  }

  function bookedClasses(subjectId) {
    const rows = bookClassSubjectRows();
    const subject = rows.find((row) => String(row.subjectId) === String(subjectId)) || rows[0] || {};
    const base = baseDate();
    const meetingDetails = Array.from({ length: configuredClassCount(3) }, (_, j) => {
      const start = plusDays(base, -j - 1);
      return {
        meetingJoinDate: fdate(start),
        startTime: displayTime(start),
        endTime: displayTime(plusMinutes(start, 45)),
        timezone: DUMMY_STUDENT_TIMEZONE,
        subjectName: subject.name,
        name: subject.teacherName,
        bookedDate: fdate(plusDays(start, -2)),
        classTypeExtraOrComp: j === 0 ? "Complimentary" : "Extra",
        meetingResult: j === 0 ? "Completed" : j === 1 ? "Reschedule Session" : "Missed by Teacher",
      };
    });
    const { img: subjectImg, name, total, booked, completed, rescheduled, missedByYou, missedByTeacher, expired, left } = subject;
    return {
      status: "1",
      statusCode: "S001",
      subjectName: subject.name,
      standardId: grade.standardId,
      registerType: "ONE_TO_ONE",
      subjectCountDatials: { img: subjectImg, name, subjectId: subject.subjectId, studentStandardId, total, booked, completed, rescheduled, missedByYou, missedByTeacher, expired, left },
      meetingDetails,
    };
  }

  const bookClassSubmit = () => ({ status: "1", statusCode: "S001", message: "Class booked successfully", studentStandardId });

  // --- Buy Extra Classes + Cart (legacy dummyExtraClass* / getDummy*Cart*; the cart lives in localStorage) ---
  function extraClassPlans() {
    if (isElementary) {
      return [
        { planId: 710010, planName: "plan-10", singleClassFee: 10, amount: 90, classCount: 10, saving: 10, validity: 4 },
        { planId: 710030, planName: "plan-30", singleClassFee: 10, amount: 275, classCount: 30, saving: 25, validity: 5 },
        { planId: 710050, planName: "plan-50", singleClassFee: 10, amount: 450, classCount: 50, saving: 50, validity: 5 },
        { planId: 710099, planName: "plan-custom", singleClassFee: 9, amount: 9, classCount: 1, saving: 0, validity: 5 },
      ];
    }
    return [
      { planId: 710001, planName: "plan-4", singleClassFee: 25, amount: 100, classCount: 4, saving: 20, validity: 4 },
      { planId: 710002, planName: "plan-8", singleClassFee: 25, amount: 180, classCount: 8, saving: 40, validity: 8 },
      { planId: 710003, planName: "plan-12", singleClassFee: 25, amount: 240, classCount: 12, saving: 60, validity: 12 },
      { planId: 710099, planName: "plan-custom", singleClassFee: 25, amount: 25, classCount: 1, saving: 0, validity: 12 },
    ];
  }

  function extraClassSubjects() {
    const enrollmentEndDate = fdate(plusMonths(baseDate(), 3));
    const list = subjects();
    // K-5 buy extra classes for the grade as a whole.
    if (isElementary) {
      const fallback = list[0] || { subjectIcon: (SUBJECT_ROWS[gradeKey] || SUBJECT_ROWS.K)[0][2] };
      return [
        {
          subjectId: gradeKey === "K" ? grade.standardId : 6512 + parseInt(gradeKey, 10),
          subjectName: grade.label,
          subjectCode: gradeKey === "K" ? "GRADE-K" : `GRADE-${gradeKey}`,
          imgURl: img(fallback),
          enrollmentEndDate,
        },
      ];
    }
    return list.map((subject) => ({ subjectId: subject.subjectId, subjectName: subject.subjectName, subjectCode: subject.subjectCode, imgURl: img(subject), enrollmentEndDate }));
  }

  const buyExtraClass = () => ({
    status: "1",
    statusCode: "S001",
    message: "Dummy Buy Extra Classes",
    details: { standardId: grade.standardId, standardName: grade.standardName, subjects: extraClassSubjects(), customPlans: extraClassPlans(), purchasedItems: [] },
  });

  const cartStorageKey = `DUMMY_EXTRA_CLASS_CART_${uid}`;
  function readCart() {
    try {
      return JSON.parse(window.localStorage.getItem(cartStorageKey) || "[]");
    } catch {
      return [];
    }
  }
  function writeCart(items) {
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(items || []));
    } catch {
      // storage unavailable: the cart just doesn't persist
    }
  }
  function cartDetailsFromItems(items) {
    const total = items.reduce((sum, item) => sum + parseFloat(item.planAmount || 0), 0);
    return {
      cartCount: items.length,
      cart: {
        cartItems: items,
        cartTotal: total,
        discountCode: "",
        cpDiscount: 0,
        totalPayAmount: total,
        bookSessionIds: items.map((item) => item.cartId).join(","),
        subjectId: items.length ? items[items.length - 1].subjectId : "",
        errorMsg: "",
      },
    };
  }

  // Plan dates as the real cart-details sends them ("Oct 30, 2026"); the plans page posts yyyy-MM-dd.
  function cartDate(value, fallback) {
    const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : fallback;
    return (Number.isNaN(date.getTime()) ? fallback : date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  function addToCart(payload = {}) {
    const subjects = extraClassSubjects();
    const subject = subjects.find((s) => String(s.subjectId) === String(payload.subjectId)) || subjects[0];
    const count = parseInt(payload.sessionCount || payload.classCount || 1, 10);
    let amount = parseFloat(payload.planAmount || payload.amount || 0);
    if (!amount || amount < 0) amount = count * 25;
    const item = {
      cartId: 810000 + parseInt(subject.subjectId, 10) + count,
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      imgURl: subject.imgURl,
      classCount: count,
      planAmount: amount,
      planStartDate: cartDate(payload.planStartDate, baseDate()),
      planEndDate: cartDate(payload.planEndDate, plusDays(baseDate(), 28)),
    };
    const items = readCart().filter((existing) => String(existing.cartId) !== String(item.cartId));
    items.push(item);
    writeCart(items);
    return { status: "1", statusCode: "S001", message: "Item added to your cart", details: cartDetailsFromItems(items) };
  }

  const cartCount = () => ({ status: "1", statusCode: "S001", cartCount: readCart().length });
  const cartDetails = () => ({ status: "1", statusCode: "S001", details: cartDetailsFromItems(readCart()) });
  function removeFromCart(cartId) {
    const items = readCart().filter((item) => String(item.cartId) !== String(cartId));
    writeCart(items);
    return { status: "1", statusCode: "S001", details: cartDetailsFromItems(items) };
  }
  const applyCartDiscount = () => ({ status: "1", statusCode: "S001", message: "Discount updated", details: cartDetailsFromItems(readCart()) });
  const cartPayment = () => ({ status: "1", statusCode: "S001", details: { planStatus: "b", standardId: grade.standardId, userPaymentDetailsId: 0 } });
  // Amount shown on the dummy checkout / success pages (legacy dummyCheckoutAmount: 90 when the cart is empty).
  const checkoutAmount = () => cartDetailsFromItems(readCart()).cart.totalPayAmount || 90;
  // Legacy imagePath(): theme2 images (card brands, logo) for the dummy checkout pages.
  const imageUrl = (name) => `${imageBaseUrl}${name}`;
  const clearCart = () => {
    try {
      window.localStorage.removeItem(cartStorageKey);
    } catch {
      // nothing to clear
    }
  };

  // --- My Attendance (legacy dummyStudentAttendanceResponse) ---
  // Legacy fields plus the names the real student-attendance-full response uses (classesAttended,
  // attendedClasses, totalClassesHeld[ThisMonth]), which the Next.js page reads; statusCode "1" = ok.
  function attendanceFull() {
    const base = baseDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const attendanceOverview = Array.from({ length: base.getMonth() + 1 }, (_, i) => {
      const attended = 18 + (i % 5);
      const absent = i % 2;
      return {
        monthKey: `${base.getFullYear()}-${pad(i + 1)}`,
        monthLabel: months[i],
        attendancePercent: Math.min(96, 76 + i + (offset % 4)),
        classesAttendedCount: attended,
        attendedClasses: attended,
        totalClassesHeld: attended + absent,
        late: i % 3,
        earlyLeave: i % 2,
        absent,
        year: base.getFullYear(),
        monthIndex: i,
      };
    });
    const active = attendanceOverview[attendanceOverview.length - 1] || {};
    const attended = active.classesAttendedCount || 20;
    const absent = active.absent || 1;
    return {
      status: "1",
      statusCode: "1",
      message: "Dummy student attendance success",
      details: {
        summary: {
          classesToday: schedule().details.schedule.length,
          attendancePercentThisMonth: active.attendancePercent || 84,
          attendanceDeltaFromLastMonth: 7,
          latePercentThisMonth: 1,
          lateDeltaFromLastMonth: 1,
          classesAttendedCount: attended,
          classesAttended: attended,
          totalClassesHeldThisMonth: attended + absent,
          late: active.late || 1,
          earlyLeave: active.earlyLeave || 0,
          absent,
          year: base.getFullYear(),
          monthIndex: base.getMonth(),
        },
        attendanceOverview,
      },
    };
  }

  // --- My Assigned Teacher (legacy dummyStudentAssignedTeacherResponse) ---
  function assignedTeachers() {
    return {
      status: "1",
      statusCode: "S001",
      message: "Dummy student assigned teachers success",
      details: {
        assignedTeachers: subjects().map((subject, index) => {
          const rawName = subject.subjectName || "Course";
          const courseName = isElementary ? cleanCourseName(rawName.replace(/ Grade (K|\d+)$/i, "")) : rawName;
          return {
            coruseId: subject.subjectId,
            selectedCourses: courseName,
            courseName,
            subjectName: courseName,
            teacherAssignedForTeacherSupport: teacher(subject, index),
            teacherName: teacher(subject, index),
          };
        }),
      },
    };
  }

  // --- My Transcript (legacy applyDummyStudentTranscriptContent) ---
  // Legacy rewrites the real transcript row only for a demo account with a demo row: demo name, the
  // demo grade(s), one dummy-parent-transcript.html link per grade; email and Student ID stay real.
  function transcript(realStudent) {
    if (!dbRow || !realStudent) return null;
    const gradeNames = [String(dbRow.gradeName || "").trim() || GRADE_CONFIG[gradeKeyByStandardId(dbRow.gradeId)]?.label || grade.label];
    const rollNumber = realStudent.rollNumber && String(realStudent.rollNumber).toUpperCase() !== "NA" ? realStudent.rollNumber : `US${String(uid).slice(-9)}`;
    const firstName = userName().split(" ")[0].toLowerCase();
    const base = baseDate();
    const courses = subjects().map((subject) => cleanCourseName(subject.subjectName)).filter(Boolean);
    const viewPath = (gradeName) => {
      const key = gradeKeyByLabel(gradeName) || gradeKey;
      const gradeShort = /k|kinder/i.test(gradeName) && !/\d/.test(gradeName) ? "K" : gradeName.match(/(\d{1,2})/)?.[1] || "5";
      const query = new URLSearchParams({
        studentName: userName(),
        gradeName,
        gradeShort,
        studentCode: rollNumber,
        birthDate: `Mar 14, ${base.getFullYear() - (6 + Math.max(0, GRADE_KEYS.indexOf(key)))}`,
        gender: /[ai]$/.test(firstName) ? "Female" : "Male",
        gpa: "3.85",
        courses: (courses.length ? courses : (SUBJECT_ROWS[key] || SUBJECT_ROWS.K).map((r) => r[1])).join("|"),
        dummyDate: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
      });
      return `/static/theme2/dummy-parent-transcript.html?${query.toString()}`;
    };
    return {
      student: { ...realStudent, name: userName(), email: realStudent.email || "demo.student@test.local", grade: gradeNames[0], rollNumber },
      transcripts: gradeNames.map((gradeName) => ({ gradeName, viewPath: viewPath(gradeName) })),
    };
  }

  return {
    userName,
    bookAClass,
    bookClassDetails,
    assignedTeacher,
    assignedTeachersForAllCourses,
    teacherWeeklyCalendar,
    bookedClasses,
    bookClassSubmit,
    buyExtraClass,
    addToCart,
    cartCount,
    cartDetails,
    removeFromCart,
    applyCartDiscount,
    cartPayment,
    checkoutAmount,
    clearCart,
    imageUrl,
    calendar,
    dashboardOrMigration,
    dashboardDetails,
    schedule,
    announcements,
    newsList,
    newsById,
    diaryThreads,
    diaryMessages,
    diaryUnreadCount,
    attendanceFull,
    assignedTeachers,
    transcript,
    loginHistory,
    feeDetails,
    academicPerformance,
    academicProgressDetail,
    academicGradeHistory,
    progressReports,
    progressReport,
    isProgressReportUrl: (url) => String(url || "").startsWith(PROGRESS_REPORT_SCHEME),
  };
}
