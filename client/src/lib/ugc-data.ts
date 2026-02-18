export interface PayMatrixEntry {
  cell: number;
  amounts: Record<string, number>;
}

export interface AcademicLevel {
  level: string;
  agp: number | null;
  payBand: string;
  entryPay: number;
  rationalisedEntryPay: number;
  ior: number;
  maxCells: number;
}

export const ACADEMIC_LEVELS: AcademicLevel[] = [
  { level: "10", agp: 6000, payBand: "15,600-39,100", entryPay: 21600, rationalisedEntryPay: 57700, ior: 2.67, maxCells: 40 },
  { level: "11", agp: 7000, payBand: "15,600-39,100", entryPay: 25790, rationalisedEntryPay: 68900, ior: 2.67, maxCells: 38 },
  { level: "12", agp: 8000, payBand: "15,600-39,100", entryPay: 29900, rationalisedEntryPay: 79800, ior: 2.67, maxCells: 34 },
  { level: "13A", agp: 9000, payBand: "37,400-67,000", entryPay: 49200, rationalisedEntryPay: 131400, ior: 2.67, maxCells: 18 },
  { level: "14", agp: 10000, payBand: "37,400-67,000", entryPay: 53000, rationalisedEntryPay: 144200, ior: 2.72, maxCells: 15 },
  { level: "15", agp: null, payBand: "67,000-79,000", entryPay: 67000, rationalisedEntryPay: 182200, ior: 2.72, maxCells: 8 },
];

export const PAY_MATRIX: Record<string, number[]> = {
  "10": [
    57700, 59400, 61200, 63000, 64900, 66800, 68800, 70900,
    73000, 75200, 77500, 79800, 82200, 84700, 87200, 89800,
    92500, 95300, 98200, 101100, 104100, 107200, 110400, 113700,
    117100, 120600, 124200, 127900, 131700, 135700, 139800, 144000,
    148300, 152700, 157300, 162000, 166900, 171900, 177100, 182400
  ],
  "11": [
    68900, 71000, 73100, 75300, 77600, 79900, 82300, 84800,
    87300, 89900, 92600, 95400, 98300, 101200, 104200, 107300,
    110500, 113800, 117200, 120700, 124300, 128000, 131800, 135800,
    139900, 144100, 148400, 152900, 157500, 162200, 167100, 172100,
    177300, 182600, 188100, 193700, 199500, 205500
  ],
  "12": [
    79800, 82200, 84100, 87200, 89800, 92500, 95300, 98200,
    101100, 104100, 107200, 110400, 113700, 117100, 120600, 124200,
    127900, 131700, 135700, 139800, 144000, 148300, 152700, 157300,
    162000, 166900, 171900, 177100, 182400, 187900, 193500, 199300,
    205300, 211500
  ],
  "13A": [
    131400, 135300, 139400, 143600, 147900, 152300, 156900, 161600,
    166400, 171400, 176500, 181800, 187300, 192900, 198700, 204100,
    210800, 217100
  ],
  "14": [
    144200, 148500, 153000, 157600, 162300, 167200, 172200, 177400,
    182100, 188200, 193800, 199600, 205600, 211800, 218200
  ],
  "15": [
    182200, 187700, 193300, 199100, 205100, 211300, 217600, 224100
  ]
};

export interface FacultyPosition {
  id: number;
  title: string;
  shortTitle: string;
  level: string;
  agp: number | null;
  specialAllowance: number;
  typicalExperience: string;
  minExperience: number;
  maxExperience: number;
}

export const FACULTY_POSITIONS: FacultyPosition[] = [
  {
    id: 1,
    title: "Assistant Professor (Entry Level)",
    shortTitle: "Asst Prof (L10)",
    level: "10",
    agp: 6000,
    specialAllowance: 0,
    typicalExperience: "0-4 years",
    minExperience: 0,
    maxExperience: 39
  },
  {
    id: 2,
    title: "Assistant Professor (Senior Scale)",
    shortTitle: "Asst Prof (L11)",
    level: "11",
    agp: 7000,
    specialAllowance: 0,
    typicalExperience: "4-8 years",
    minExperience: 0,
    maxExperience: 37
  },
  {
    id: 3,
    title: "Assistant Professor (Selection Grade)",
    shortTitle: "Asst Prof (L12)",
    level: "12",
    agp: 8000,
    specialAllowance: 0,
    typicalExperience: "8-12 years",
    minExperience: 0,
    maxExperience: 33
  },
  {
    id: 4,
    title: "Associate Professor",
    shortTitle: "Assoc Prof (L13A)",
    level: "13A",
    agp: 9000,
    specialAllowance: 0,
    typicalExperience: "12-15 years",
    minExperience: 0,
    maxExperience: 17
  },
  {
    id: 5,
    title: "Professor",
    shortTitle: "Prof (L14)",
    level: "14",
    agp: 10000,
    specialAllowance: 0,
    typicalExperience: "15-20 years",
    minExperience: 0,
    maxExperience: 14
  },
  {
    id: 6,
    title: "Professor (HAG Scale)",
    shortTitle: "Prof HAG (L15)",
    level: "15",
    agp: null,
    specialAllowance: 0,
    typicalExperience: "20+ years",
    minExperience: 0,
    maxExperience: 7
  },
  {
    id: 7,
    title: "Principal (UG College)",
    shortTitle: "Principal UG",
    level: "13A",
    agp: 9000,
    specialAllowance: 2000,
    typicalExperience: "12-15 years",
    minExperience: 0,
    maxExperience: 17
  },
  {
    id: 8,
    title: "Principal (PG College)",
    shortTitle: "Principal PG",
    level: "14",
    agp: 10000,
    specialAllowance: 3000,
    typicalExperience: "15-20 years",
    minExperience: 0,
    maxExperience: 14
  }
];

export type CityType = 'X' | 'Y' | 'Z';

export const HRA_RATES: Record<CityType, { rate: number; label: string; population: string }> = {
  X: { rate: 30, label: "X-Class City", population: "50 Lakhs and above" },
  Y: { rate: 20, label: "Y-Class City", population: "5 to 50 Lakhs" },
  Z: { rate: 10, label: "Z-Class City", population: "Below 5 Lakhs" },
};

export const CITY_EXAMPLES: Record<CityType, string[]> = {
  X: ["Ahmedabad", "Bengaluru", "Chennai", "Delhi", "Hyderabad", "Kolkata", "Mumbai", "Pune"],
  Y: ["Agra", "Goa (Panaji/Margao)", "Jaipur", "Lucknow", "Chandigarh", "Indore", "Bhopal", "Kochi", "Mangaluru", "Mysuru", "Nashik", "Surat", "Vadodara", "Varanasi"],
  Z: ["All other cities and towns"]
};

export const TA_RATES = {
  level9Plus: { tptaCity: 7200, otherCity: 3600 },
  level3to8: { tptaCity: 3600, otherCity: 1800 },
  level1to2: { tptaCity: 1350, otherCity: 900 }
};

export const TPTA_CITIES = [
  "Hyderabad", "Patna", "Delhi", "Ahmedabad", "Surat", "Bangalore",
  "Kochi", "Kozhikode", "Indore", "Mumbai", "Nagpur", "Pune",
  "Jaipur", "Chennai", "Coimbatore", "Ghaziabad", "Kanpur", "Lucknow", "Kolkata"
];

export const DA_HISTORY = [
  { date: "Jul 2025", rate: 58, label: "Current" },
  { date: "Jan 2025", rate: 55, label: "" },
  { date: "Jul 2024", rate: 53, label: "" },
  { date: "Jan 2024", rate: 50, label: "" },
  { date: "Jul 2023", rate: 46, label: "" },
  { date: "Jan 2023", rate: 42, label: "" },
  { date: "Jul 2022", rate: 38, label: "" },
  { date: "Jan 2022", rate: 34, label: "" },
];

export type FinancialStrategy = 'multiplier' | 'premium' | 'both' | 'higher' | 'lower';

export const FINANCIAL_STRATEGIES: { value: FinancialStrategy; label: string; description: string }[] = [
  { value: "multiplier", label: "Multiplier Only", description: "Apply salary multiplier without annual premium" },
  { value: "premium", label: "Premium Only", description: "Add annual premium without multiplier enhancement" },
  { value: "both", label: "Multiplier + Premium", description: "Apply both multiplier and annual premium together" },
  { value: "higher", label: "Higher of Both", description: "Compare multiplier vs premium result, use higher value" },
  { value: "lower", label: "Lower of Both", description: "Compare multiplier vs premium result, use lower value" },
];

export type MultiplierMethod = 'methodA' | 'methodB';

export const MULTIPLIER_METHODS: { value: MultiplierMethod; label: string; description: string; detail: string }[] = [
  {
    value: "methodA",
    label: "Method A: Multiplier on Total UGC",
    description: "Keeps basic pay constant at UGC standard",
    detail: "Multiplier is applied to the total UGC salary (Basic + DA + HRA + TA), not the basic pay. This keeps your basic constant, reducing future liability for WPU GOA while still offering competitive total compensation."
  },
  {
    value: "methodB",
    label: "Method B: Multiplier on Basic Pay",
    description: "Traditional method - increases basic pay",
    detail: "Multiplier is applied directly to the basic pay. DA, HRA are then recalculated on the new (higher) basic. This increases future liability as all allowances scale with the enhanced basic."
  }
];
