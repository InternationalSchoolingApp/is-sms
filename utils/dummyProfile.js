/**
 * Sample "My Profile" for dummy (demo) student mode — the same shape services/profileApi.js getMyProfile() returns
 * ({ profile, places, withdrawalEligible }), so utils/profileModel.js builds the page from it unchanged.
 *
 * The profile page used to load the signed-in account's REAL profile in dummy mode, and an edit made while demonstrating
 * was saved for real. Now nothing real is read or written: rightToEdit / rightToUpload are off (the page is view-only),
 * there is no enrolment id for the editors, and the withdrawal section is hidden.
 */
export function createDummyProfileAnswer({ name = "", schoolName = "" } = {}) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = words[0] || "Demo";
  const lastName = words.length > 1 ? words[words.length - 1] : "Student";
  const personal = {
    firstName,
    lastName,
    gender: "FEMALE",
    dob: "Jan 12, 2012",
    phoneNumber: "5551234567",
    phoneNumberCountryCode: "+1",
    studentEmailId: "demo.student@example.com",
    timezoneName: "Asia/Singapore",
    nationality: "Singapore",
    address: "12 Sample Street, Demo City",
    hobbies: [
      { hobbiesLabel: "Reading", status: "Y" },
      { hobbiesLabel: "Drawing", status: "Y" },
      { hobbiesLabel: "Football", status: "N" },
    ],
    socialMedia: [],
    profilePic: "",
  };
  const parents = {
    motherName: "Sample",
    motherLastName: "Parent",
    motherPhoneNumber: "5557654321",
    motherPhoneNumberCountryCode: "+1",
    motherEmail: "demo.parent@example.com",
    relationType: "Mother",
    pcWhatsappView: "Y",
    pcCallView: "Y",
    pcEmailView: "Y",
    callingTimePrefArray: [],
  };
  const academic = {
    studentID: "DEMO-0001",
    academicYearStartDate: "Aug 01, 2026",
    enrollmentDate: "Jul 15, 2026",
    learningProgram: "One to One",
    grade: "Demo grade",
    learningPlatform: "Demo LMS",
    courses: ["Mathematics (MTH-01)", "English (ENG-01)", "Science (SCI-01)"],
    previousCurrentSchoolName: schoolName ? `${schoolName} (sample)` : "Sample School",
    standardStatus: "0",
    systemTrainingStatus: "Skipped",
  };
  const timing = { prefTimeList: [] };
  const sports = { joinedSportsAndECList: [], sportsAndECList: [] };
  return {
    profile: {
      status: "1",
      message: "Demo profile",
      rightToEdit: false,
      rightToUpload: false,
      profileData: { profileContactVerification: {}, studentProfile: [personal, parents, academic, timing, sports, {}, {}] },
    },
    places: { countries: {}, states: {}, cities: {} },
    withdrawalEligible: false,
  };
}
