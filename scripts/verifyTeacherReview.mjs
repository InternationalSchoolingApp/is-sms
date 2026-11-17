// Teacher registration Step 3, the review screen: how the saved details are listed (utils/teacherReview.js).
// No server needed. Run: npm run verify:teacher-review
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTeacherDocumentRows,
  buildTeacherPersonalRows,
  buildTeacherProfessionalRows,
  formatReviewDob,
  teacherFullName,
} from "../utils/teacherReview.js";

test("the full name skips blank parts", () => {
  assert.equal(teacherFullName({ firstName: "Aazim", middleName: "", lastName: "Shaikh" }), "Aazim Shaikh");
  assert.equal(teacherFullName({ firstName: " Aazim ", middleName: "K", lastName: "Shaikh" }), "Aazim K Shaikh");
  assert.equal(teacherFullName(null), "");
});

test("a date of birth is shown as typed, never shifted a day by the timezone", () => {
  assert.equal(formatReviewDob(new Date(1990, 0, 5)), "Jan 5, 1990");
  assert.equal(formatReviewDob(null), "");
  assert.equal(formatReviewDob(new Date("nope")), "");
});

test("the personal rows are the legacy ones, in order", () => {
  const rows = buildTeacherPersonalRows({
    fields: {
      firstName: "Aazim",
      middleName: "",
      lastName: "Shaikh",
      communicationEmail: "a@b.com",
      countryIsdCode: "+65",
      contactNumber: "81234567",
      dob: new Date(1990, 0, 5),
    },
    genderLabel: "Male",
    countryName: "Singapore",
    stateName: "Central",
    cityName: "Singapore",
  });
  assert.deepEqual(
    rows.map((row) => [row.label, row.value]),
    [
      ["Name", "Aazim Shaikh"],
      ["Email", "a@b.com"],
      ["Gender", "Male"],
      ["Phone Number", "+65 81234567"],
      ["Date of Birth", "Jan 5, 1990"],
      ["Country", "Singapore"],
      ["State", "Central"],
      ["City", "Singapore"],
    ]
  );
});

test("the professional rows turn the saved keys into what the teacher chose", () => {
  const rows = buildTeacherProfessionalRows({
    schoolNumericId: 1,
    fields: {
      highestQualificationId: "Masters",
      educationSpecialization: "Physics",
      totalExperienceYears: "5",
      lastOrganizationName: "Acme School",
      lastJobDesc: "I love teaching",
      grades: ["1", "11", "12"],
      courses: { elementary: ["Art"], middle: ["Math", "Science"], high: [] },
    },
  });
  const byLabel = Object.fromEntries(rows.map((row) => [row.label, row.value]));
  assert.equal(byLabel["Highest Education Degree"], "Master's");
  assert.equal(byLabel["Total Online Teaching Experience"], "5 Years");
  // the picker's own order (KG first for a school that teaches KG), not the order they were saved in
  assert.equal(byLabel["Grades taught"], "KG, Grade 1, Grade 6");
  assert.equal(byLabel["Courses taught"], "Art, Math, Science");
  assert.equal(buildTeacherProfessionalRows({ fields: { totalExperienceYears: "1" } })[2].value, "1 Year");
});

test("a school that does not teach KG never lists it", () => {
  const rows = buildTeacherProfessionalRows({ schoolNumericId: 2, fields: { grades: ["11", "12"] } });
  assert.equal(rows.find((row) => row.label === "Grades taught").value, "Grade 1");
});

test("a document that is not uploaded shows NA when optional and Not uploaded when required", () => {
  const rows = buildTeacherDocumentRows({ 2: { name: "degree.pdf", url: "https://s3/x" } });
  const byLabel = Object.fromEntries(rows.map((row) => [row.label, row]));
  assert.deepEqual([byLabel["Highest Degree"].name, byLabel["Highest Degree"].url], ["degree.pdf", "https://s3/x"]);
  assert.equal(byLabel["Proof of last Work-Experience"].name, "NA");
  assert.equal(byLabel["Updated CV"].name, "Not uploaded");
  assert.equal(byLabel["Updated CV"].url, "");
});
