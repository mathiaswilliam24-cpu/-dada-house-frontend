/** Installation project pipeline (pure — safe for client components). */

export const PROJECT_STAGES = [
  { key: "LEAD", label: "New lead", group: "Sales" },
  { key: "SITE_SURVEY", label: "Site survey / load calculation", group: "Sales", job: { jobType: "INSTALLATION", category: "Site Survey / Load Calculation", minutes: 90 } },
  { key: "PROPOSAL_SENT", label: "Proposal sent", group: "Sales" },
  { key: "PROPOSAL_APPROVED", label: "Proposal approved", group: "Sales" },
  { key: "DEPOSIT_COLLECTED", label: "Deposit collected", group: "Sales" },
  { key: "FINANCING", label: "Financing approved", group: "Sales", optional: true },
  { key: "PERMIT_APPLIED", label: "Permit applied", group: "Permits & equipment" },
  { key: "PERMIT_APPROVED", label: "Permit approved", group: "Permits & equipment" },
  { key: "EQUIPMENT_ORDERED", label: "Equipment ordered", group: "Permits & equipment" },
  { key: "EQUIPMENT_RECEIVED", label: "Equipment received", group: "Permits & equipment" },
  { key: "INSTALL_SCHEDULED", label: "Installation scheduled", group: "Installation", job: { jobType: "INSTALLATION", category: "Complete HVAC System Installation", minutes: 480 } },
  { key: "INSTALL_IN_PROGRESS", label: "Installation in progress", group: "Installation" },
  { key: "INSTALL_COMPLETE", label: "Installation complete", group: "Installation" },
  { key: "INSPECTION_SCHEDULED", label: "Inspection scheduled", group: "Closeout", job: { jobType: "OTHER", category: "Permit Inspection", minutes: 60 } },
  { key: "INSPECTION_PASSED", label: "Inspection passed", group: "Closeout" },
  { key: "FINAL_PAYMENT", label: "Final payment collected", group: "Closeout" },
  { key: "CLOSED", label: "Closed — warranty registered", group: "Closeout" },
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number]["key"];
export const PROJECT_STAGE_KEYS = PROJECT_STAGES.map((s) => s.key) as ProjectStage[];
export const stageIndex = (k: string) => PROJECT_STAGE_KEYS.indexOf(k as ProjectStage);
export const stageInfo = (k: string) => PROJECT_STAGES[Math.max(0, stageIndex(k))];
export const PROJECT_GROUPS = ["Sales", "Permits & equipment", "Installation", "Closeout"] as const;
