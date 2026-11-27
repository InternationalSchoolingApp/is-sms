/** "Copyright © 2026 - {school} - All Rights Reserved." (no school name known: the name part is left out). */
export const copyrightLine = (schoolName) =>
  `Copyright © ${new Date().getFullYear()}${schoolName ? ` - ${schoolName}` : ""} - All Rights Reserved.`;
