export interface MissingDetailAlert {
  assetId: string;
  assetTag: string;
  makeModel: string;
  assignedStaff: string;
  assignedStaffEmail?: string;
  branch: string;
  missingFields: string[];
  actionRequiredBy: "STAFF" | "ADMIN";
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  resolutionGuide: string;
}
