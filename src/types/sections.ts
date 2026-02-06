export interface SectionColumn {
  key: string;
  label: string;
}

export interface SectionConfig {
  id: string;
  name: string;
  slug: string;
  columns: SectionColumn[];
  order: number;
  isCustom?: boolean;
}

export type RecordData = Record<string, string | number | undefined>;

export interface StoredRecord {
  id?: string;
  sectionId: string;
  [key: string]: string | number | undefined;
}

export const BUILT_IN_SECTIONS: SectionConfig[] = [
  {
    id: "allEmp",
    name: "All Emp",
    slug: "allEmp",
    order: 1,
    columns: [
      { key: "employeeNumber", label: "Employee Number" },
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "dateOfJoining", label: "Date of Joining" },
      { key: "jobTitle", label: "Job Title" },
      { key: "businessUnit", label: "Business Unit" },
      { key: "department", label: "Department" },
      { key: "subDepartment", label: "Sub Department" },
      { key: "location", label: "Location" },
      { key: "costCenter", label: "Cost Center" },
      { key: "legalEntity", label: "Legal Entity" },
      { key: "band", label: "Band" },
      { key: "reportingTo", label: "Reporting To" },
      { key: "dottedLineManager", label: "Dotted Line Manager" },
    ],
  },
  {
    id: "allEmpLicense",
    name: "All Emp License",
    slug: "allEmpLicense",
    order: 2,
    columns: [
      { key: "empId", label: "Emp ID" },
      { key: "userDisplayName", label: "User Display name" },
      { key: "userMailId", label: "User mail ID" },
      { key: "userLicenseType", label: "User License type" },
      { key: "dateOfJoin", label: "Date of Join" },
      { key: "date", label: "Date" },
      { key: "toWhomWeSwap", label: "To whom we swap" },
      { key: "deletedDate", label: "Deleted date" },
    ],
  },
  {
    id: "allDeptGroups",
    name: "All dept groups",
    slug: "allDeptGroups",
    order: 3,
    columns: [
      { key: "name", label: "Name" },
      { key: "userPrincipalName", label: "User principal name" },
      { key: "owner", label: "Owner" },
    ],
  },
  {
    id: "allLaptop",
    name: "All Laptop",
    slug: "allLaptop",
    order: 4,
    columns: [
      { key: "productSerialNumber", label: "Product Serial Number" },
      { key: "laptopType", label: "Laptop Type" },
      { key: "userName", label: "User Name" },
      { key: "issueDate", label: "Issue Date" },
      { key: "assigningDate", label: "Assigning date" },
      { key: "warranty", label: "Warrenty" },
      { key: "anyChangesInHardware", label: "Any changes in Hardware" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "nonLaptopUsers",
    name: "Non Laptop users",
    slug: "nonLaptopUsers",
    order: 5,
    columns: [
      { key: "employeeNumber", label: "Employee Number" },
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "dateOfJoining", label: "Date of Joining" },
      { key: "jobTitle", label: "Job Title" },
      { key: "laptopStatus", label: "Laptop Status" },
    ],
  },
  {
    id: "laptopCourierDetails",
    name: "Laptop courier details",
    slug: "laptopCourierDetails",
    order: 6,
    columns: [
      { key: "name", label: "Name" },
      { key: "idDeletedDate", label: "ID deleted date" },
      { key: "courierVendor", label: "Courier vendor" },
      { key: "courierDate", label: "Courier date" },
      { key: "courierDeliveredDate", label: "Courier delivered date" },
    ],
  },
  {
    id: "underTicketLaptops",
    name: "Under ticket- Laptops",
    slug: "underTicketLaptops",
    order: 7,
    columns: [
      { key: "usernames", label: "Usernames" },
      { key: "laptopSerialNumber", label: "Laptop serial number" },
      { key: "issue", label: "Issue" },
      { key: "ticketStatus", label: "Ticket status" },
      { key: "vendor", label: "Vendor" },
      { key: "finalStatus", label: "Final status" },
      { key: "expectationDate", label: "Expectation date" },
    ],
  },
  {
    id: "backup",
    name: "Backup",
    slug: "backup",
    order: 8,
    columns: [
      { key: "month", label: "Month" },
      { key: "usernames", label: "Username's" },
      { key: "totalBackup", label: "total backup" },
    ],
  },
  {
    id: "windowsMacAddress",
    name: "Windows MAC address",
    slug: "windowsMacAddress",
    order: 9,
    columns: [
      { key: "serialNumber", label: "Serial Number" },
      { key: "model", label: "Model" },
      { key: "userName", label: "User name" },
      { key: "macAddress", label: "Mac Address" },
    ],
  },
  {
    id: "macMacAddress",
    name: "MAC - MAC address",
    slug: "macMacAddress",
    order: 10,
    columns: [
      { key: "productSerialNumber", label: "Product Serial Number" },
      { key: "laptopType", label: "Laptop Type" },
      { key: "userName", label: "User Name" },
      { key: "macAddress", label: "Mac Address" },
    ],
  },
  {
    id: "dlGroups",
    name: "DL Groups",
    slug: "dlGroups",
    order: 11,
    columns: [
      { key: "groupName", label: "Group name" },
      { key: "groupPrimaryEmail", label: "Group primary email" },
      { key: "createdOn", label: "Created on" },
      { key: "owner", label: "Owner" },
    ],
  },
  {
    id: "allMonitors",
    name: "All Monitors",
    slug: "allMonitors",
    order: 12,
    columns: [
      { key: "assetId", label: "Asset Id" },
      { key: "assetName", label: "Asset Name" },
      { key: "username", label: "Username" },
    ],
  },
];
