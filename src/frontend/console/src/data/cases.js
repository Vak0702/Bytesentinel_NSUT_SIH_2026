// Mock case records. In production this is replaced by GET /api/cases.

export const officers = [
  { id: "BOI-4471", name: "Insp. R. Deshmukh", initials: "RD" },
  { id: "BOI-3390", name: "SI A. Kaur", initials: "AK" },
  { id: "BOI-2217", name: "SI M. Iqbal", initials: "MI" },
  { id: "BOI-5502", name: "ASI P. Nair", initials: "PN" },
];

export const mockCases = [];

export const queueNow = [];

export function getCases() {
  return mockCases;
}

export function getCaseById(caseId) {
  return mockCases.find((c) => c.caseId === caseId);
}

export function getFlaggedTravellers() {
  return mockCases.filter((c) => c.status === "Under investigation");
}
