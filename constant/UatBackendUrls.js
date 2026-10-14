// Preset list shown in the UAT backend picker's dropdown (see
// components/common/BackendSwitcher.jsx) — testers can still type any other
// host via the picker's custom field. Not env-driven on purpose: this only
// ever needs to change when a UAT backend instance is added/retired, same
// cadence as editing source.
export const UAT_BACKEND_URLS = [
  "http://164.52.203.90:8100",
  "http://164.52.203.90:8200",
  "http://164.52.203.90:8300",
  "http://164.52.203.90:8400",
  "http://164.52.203.90:8500",
  "http://164.52.208.63:8400",
  "http://164.52.208.63:8200",
  "https://sms-is.ischoolusa.com",
  "https://sms-staging.ischoolusa.com"
];
