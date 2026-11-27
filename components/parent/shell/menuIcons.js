// The parent menu icons from the design board (ParentChildDashboard.html), as SVG inner markup, keyed by the menu
// item's page segment. Static markup written here, never user input.
export const MENU_ICONS = {
  "": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"2\"/><path d=\"M17.5 14v7M14 17.5h7\"/>", // Parent Dashboard
  "parent-class-schedule": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2\"/>", // Class Schedule
  "parent-syllabus-assigned-teacher": "<circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M2 21v-1a6 6 0 0 1 6-6h2M14.5 18l2.2 2.2 4.3-4.4\"/>", // Assigned Teachers
  "parent-fee-details": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M15 9.2a3 3 0 0 0-3-1.7c-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2a3.2 3.2 0 0 1-3.1-1.8M12 6v1.5M12 16.5V18\"/>", // Fee Details
  "parent-download-academic-docs": "<path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6M12 12v6M9 15l3 3 3-3\"/>", // Download Academic Docs
  "parent-attendance": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4\"/>", // Attendance
  "parent-academic-performance": "<circle cx=\"12\" cy=\"9\" r=\"6\"/><path d=\"M8.5 13.9 7 22l5-3 5 3-1.5-8.1M12 6.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z\"/>", // Academic Performance
  "parent-progress": "<path d=\"M3 21h18M6 17v-4M11 17V9M16 17v-6M20 5l-5 5-3-3-6 6\"/>", // Progress
  "parent-student-login-details": "<path d=\"M3 12a9 9 0 1 0 3-6.7L3 8\"/><path d=\"M3 3v5h5M12 7v5l3 2\"/>", // Child Log in History
  "inbox": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/>", // Communications
};

// Same icons by label, for a menu item whose segment is not one of the above.
export const MENU_ICONS_BY_LABEL = {
  "Parent Dashboard": MENU_ICONS[""],
  "Class Schedule": MENU_ICONS["parent-class-schedule"],
  "Assigned Teachers": MENU_ICONS["parent-syllabus-assigned-teacher"],
  "Fee Details": MENU_ICONS["parent-fee-details"],
  "Download Academic Docs": MENU_ICONS["parent-download-academic-docs"],
  "Attendance": MENU_ICONS["parent-attendance"],
  "Academic Performance": MENU_ICONS["parent-academic-performance"],
  "Progress": MENU_ICONS["parent-progress"],
  "Child Log in History": MENU_ICONS["parent-student-login-details"],
  "Communications": MENU_ICONS["inbox"],
};
