export const summaryStats = [
  { label: "Documents screened", value: "0", sub: "Aug 01 – Sep 05", tone: "ink" },
  { label: "Forgery cases", value: "0", sub: "0% of all documents", tone: "danger" },
  { label: "Tampering found", value: "0", sub: "photo, date and stamp edits", tone: "danger" },
  { label: "Face mismatches", value: "0", sub: "0 confirmed impersonations", tone: "warn" },
  { label: "Travellers flagged", value: "0", sub: "passed to investigations", tone: "warn" },
  { label: "Manual reviews", value: "0", sub: "0% of all documents", tone: "ink" },
  { label: "Average processing", value: "0s", sub: "from scan to decision", tone: "safe" },
];

export const weeklyForgery = [
  { week: "W27", forged: 0, tampering: 0 },
  { week: "W28", forged: 0, tampering: 0 },
  { week: "W29", forged: 0, tampering: 0 },
  { week: "W30", forged: 0, tampering: 0 },
  { week: "W31", forged: 0, tampering: 0 },
  { week: "W32", forged: 0, tampering: 0 },
  { week: "W33", forged: 0, tampering: 0 },
  { week: "W34", forged: 0, tampering: 0 },
];

export const accuracyBreakdown = {
  overall: 0,
  segments: [
    { label: "Forgeries correctly caught", value: 0, color: "var(--color-safe)" },
    { label: "Cleared travellers wrongly stopped", value: 0, color: "var(--color-warn)" },
    { label: "Missed and caught by an officer", value: 0, color: "var(--color-danger)" },
  ],
};

export const casesByCountry = [
  { country: "Nigeria", count: 0 },
  { country: "Pakistan", count: 0 },
  { country: "Bangladesh", count: 0 },
  { country: "Afghanistan", count: 0 },
  { country: "Ukraine", count: 0 },
];

export const officerPerformance = [
  { officer: "Insp. R. Deshmukh", screened: 0, flagged: 0, avgTime: "0s", accuracy: "0%" },
  { officer: "SI A. Kaur", screened: 0, flagged: 0, avgTime: "0s", accuracy: "0%" },
  { officer: "SI M. Iqbal", screened: 0, flagged: 0, avgTime: "0s", accuracy: "0%" },
  { officer: "ASI P. Nair", screened: 0, flagged: 0, avgTime: "0s", accuracy: "0%" },
];

// Weekly screening activity, Monday through Sunday in chronological order.
// `label` is what the x-axis renders; `day` is the full name used by the tooltip.
export const weeklyScreeningActivity = [
  { day: "Monday", label: "Mon", count: 0 },
  { day: "Tuesday", label: "Tue", count: 0 },
  { day: "Wednesday", label: "Wed", count: 0 },
  { day: "Thursday", label: "Thu", count: 0 },
  { day: "Friday", label: "Fri", count: 0 },
  { day: "Saturday", label: "Sat", count: 0 },
  { day: "Sunday", label: "Sun", count: 0 },
];

export const riskDistribution = [
  { label: "Low (0-40)", value: 0, color: "var(--color-safe)" },
  { label: "Medium (41-70)", value: 0, color: "var(--color-warn)" },
  { label: "High (71-100)", value: 0, color: "var(--color-danger)" },
];
