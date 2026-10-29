import type { Category, Gender, Scholarship, Student } from "./types";

type Row = [string, number, number, Category, Gender, string, boolean?, boolean?];

// name, marks %, income INR, category, gender, branch, rural, sports
const ROWS: Row[] = [
  ["Aarav Sharma", 94, 1200000, "General", "Male", "CSE"],
  ["Ananya Iyer", 91, 250000, "OBC", "Female", "CSE", true],
  ["Rohan Meena", 78, 180000, "ST", "Male", "ME", true],
  ["Priya Jatav", 88, 220000, "SC", "Female", "IT"],
  ["Kabir Khan", 66, 150000, "EWS", "Male", "Civil", true],
  ["Sneha Reddy", 96, 900000, "General", "Female", "ECE"],
  ["Vikram Singh", 72, 600000, "General", "Male", "ME", false, true],
  ["Meera Nair", 83, 280000, "OBC", "Female", "IT"],
  ["Arjun Paswan", 69, 140000, "SC", "Male", "EEE", true],
  ["Divya Patel", 89, 750000, "EWS", "Female", "CSE"],
  ["Ishaan Gupta", 58, 120000, "General", "Male", "Civil", true],
  ["Kavya Murmu", 81, 160000, "ST", "Female", "ECE", true],
  ["Rahul Verma", 90, 1800000, "General", "Male", "ME"],
  ["Pooja Yadav", 77, 320000, "OBC", "Female", "EEE", true, true],
  ["Siddharth Rao", 63, 450000, "EWS", "Male", "IT"],
  ["Nisha Valmiki", 74, 200000, "SC", "Female", "CSE"],
  ["Aditya Kulkarni", 92, 400000, "General", "Male", "CSE"],
  ["Riya Das", 86, 290000, "OBC", "Female", "ECE"],
  ["Manoj Oraon", 61, 110000, "ST", "Male", "Civil", true, true],
  ["Tanvi Joshi", 79, 700000, "EWS", "Female", "IT"],
  ["Harsh Mehta", 55, 2500000, "General", "Male", "ME", false, true],
  ["Lakshmi Pillai", 87, 180000, "SC", "Female", "IT", true],
  ["Farhan Ali", 71, 260000, "OBC", "Male", "EEE"],
  ["Sakshi Bhil", 68, 130000, "ST", "Female", "CSE", true],
  ["Neel Chatterjee", 95, 650000, "General", "Male", "ECE"],
  ["Zoya Ansari", 84, 380000, "EWS", "Female", "CSE"],
  ["Gaurav Kumar", 50, 90000, "SC", "Male", "Civil", true],
  ["Aditi Bose", 89, 1400000, "General", "Female", "CSE"],
  ["Suresh Gond", 76, 170000, "ST", "Male", "ME", true],
  ["Alex Fernandes", 82, 520000, "OBC", "Other", "IT", false, true],
];

export function seedStudents(): Student[] {
  return ROWS.map(([name, marks, income, category, gender, branch, rural, sports], i) => ({
    id: `STU${String(i + 1).padStart(3, "0")}`,
    name,
    marks,
    income,
    category,
    gender,
    branch,
    rural: !!rural,
    sportsQuota: !!sports,
  }));
}

const ALL: Category[] = ["General", "OBC", "SC", "ST", "EWS"];
const mk = (s: Omit<Scholarship, "totalFund">): Scholarship => ({ ...s, totalFund: s.seats * s.amount });

export function seedScholarships(): Scholarship[] {
  return [
    mk({ id: "SCH01", name: "Merit Excellence", minMarks: 85, maxIncome: 1500000, categories: ALL, seats: 4, amount: 50000 }),
    mk({ id: "SCH02", name: "Need-Based Aid", minMarks: 60, maxIncome: 300000, categories: ALL, seats: 5, amount: 40000 }),
    mk({ id: "SCH03", name: "SC/ST Support", minMarks: 50, maxIncome: 800000, categories: ["SC", "ST"], seats: 4, amount: 35000 }),
    mk({ id: "SCH04", name: "EWS Grant", minMarks: 60, maxIncome: 800000, categories: ["EWS"], seats: 3, amount: 30000 }),
    mk({ id: "SCH05", name: "Women in Tech", minMarks: 70, maxIncome: 1200000, categories: ALL, genders: ["Female"], branches: ["CSE", "IT", "ECE"], seats: 3, amount: 45000 }),
    mk({ id: "SCH06", name: "Rural Student Fund", minMarks: 55, maxIncome: 500000, categories: ALL, requireRural: true, seats: 3, amount: 25000 }),
    mk({ id: "SCH07", name: "Sports Merit", minMarks: 60, maxIncome: 2000000, categories: ALL, requireSports: true, seats: 2, amount: 30000 }),
    mk({ id: "SCH08", name: "Research Fellowship", minMarks: 88, maxIncome: 2000000, categories: ALL, branches: ["CSE", "ECE", "ME"], seats: 2, amount: 60000 }),
  ];
}

export const DEFAULT_WEIGHTS = { merit: 0.5, need: 0.4, category: 0.1 };
