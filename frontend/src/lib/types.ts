/** Mirrors the Pydantic schemas in `backend/app/schemas.py`. */

export type GoatSex = "male" | "female";
export type GoatStatus = "active" | "sold" | "expired";
export type AcquisitionType = "bred" | "purchased";
export type CrossingStatus = "pregnant" | "kidded" | "aborted" | "failed";
export type HealthRecordType = "illness" | "treatment" | "deworming" | "checkup";

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface Breed {
  id: string;
  name: string;
  code: string;
  description: string | null;
  goat_count: number;
}

export interface Profile {
  id: string;
  display_name: string;
  email: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  display_name: string;
}

export interface GoatSummary {
  id: string;
  tag_number: string;
  name: string | null;
  sex: GoatSex;
  status: GoatStatus;
  acquisition_type: AcquisitionType;
  breed_id: string;
  breed_name: string | null;
  breed_code: string | null;
  date_of_birth: string | null;
  age_months: number | null;
  photo_url: string | null;
  color: string | null;
  is_pregnant: boolean;
  kids_count: number;
}

export interface GoatDetail extends GoatSummary {
  dam_id: string | null;
  sire_id: string | null;
  dam: GoatSummary | null;
  sire: GoatSummary | null;
  crossing_id: string | null;
  purchase_date: string | null;
  purchase_price: string | null;
  purchased_from: string | null;
  expired_on: string | null;
  death_cause: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface GoatCreate {
  name?: string | null;
  breed_id: string;
  sex: GoatSex;
  date_of_birth?: string | null;
  acquisition_type: AcquisitionType;
  purchase_date?: string | null;
  purchase_price?: string | null;
  purchased_from?: string | null;
  dam_id?: string | null;
  sire_id?: string | null;
  crossing_id?: string | null;
  color?: string | null;
  photo_url?: string | null;
  notes?: string | null;
}

export interface Crossing {
  id: string;
  dam_id: string;
  sire_id: string | null;
  dam: GoatSummary | null;
  sire: GoatSummary | null;
  crossing_date: string;
  expected_kidding_date: string;
  actual_kidding_date: string | null;
  number_of_kids: number | null;
  kids_registered: number;
  status: CrossingStatus;
  days_remaining: number | null;
  is_overdue: boolean;
  notes: string | null;
  created_at: string;
}

export interface Vaccination {
  id: string;
  goat_id: string;
  goat: GoatSummary | null;
  vaccine_name: string;
  date_administered: string;
  dose: string | null;
  notes: string | null;
}

export interface Weight {
  id: string;
  goat_id: string;
  weight_kg: string;
  measured_on: string;
  notes: string | null;
}

export interface HealthRecord {
  id: string;
  goat_id: string;
  goat: GoatSummary | null;
  record_date: string;
  type: HealthRecordType;
  description: string;
  medication: string | null;
  notes: string | null;
}

export interface Expense {
  id: string;
  expense_date: string;
  name: string;
  amount: string;
  paid_by: string;
  payer_name: string | null;
  goat_id: string | null;
  goat_tag: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
}

export interface PayerTotal {
  user_id: string;
  display_name: string;
  total: string;
}

export interface ExpenseSummary {
  total_amount: string;
  per_payer: PayerTotal[];
  count: number;
}

export interface ExpensePage extends Page<Expense> {
  summary: ExpenseSummary;
}

export interface BalanceEntry {
  user_id: string;
  display_name: string;
  paid: string;
  share: string;
  settlements_paid: string;
  settlements_received: string;
  net: string;
}

export interface Balance {
  total_expenses: string;
  per_person: BalanceEntry[];
  settled: boolean;
  debtor_id: string | null;
  debtor_name: string | null;
  creditor_id: string | null;
  creditor_name: string | null;
  amount_owed: string | null;
  message: string;
}

export interface MonthlyBucket {
  period: string;
  label: string;
  total: string;
  count: number;
  per_payer: PayerTotal[];
}

export interface Settlement {
  id: string;
  from_user: string;
  from_name: string | null;
  to_user: string;
  to_name: string | null;
  amount: string;
  settled_on: string;
  note: string | null;
}

export interface PedigreeNode {
  id: string | null;
  tag_number: string | null;
  name: string | null;
  sex: GoatSex | null;
  breed_name: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  status: GoatStatus | null;
  relation: "dam" | "sire" | null;
  generation: number;
  is_placeholder: boolean;
  dam: PedigreeNode | null;
  sire: PedigreeNode | null;
}

export interface Pedigree {
  root: PedigreeNode;
  generations: number;
  known_ancestors: number;
  total_slots: number;
}

export interface TimelineEvent {
  date: string;
  kind:
    | "born"
    | "purchased"
    | "crossed"
    | "kidded"
    | "kid_registered"
    | "vaccinated"
    | "weighed"
    | "health"
    | "expense"
    | "expired";
  title: string;
  detail: string | null;
  ref_id: string | null;
}

export interface GoatHistory {
  goat: GoatDetail;
  kids: GoatSummary[];
  kids_total: number;
  crossings: Crossing[];
  crossings_total: number;
  vaccinations: Vaccination[];
  vaccinations_total: number;
  weights: Weight[];
  weights_total: number;
  health_records: HealthRecord[];
  health_records_total: number;
  expenses: Expense[];
  expenses_total: number;
  expenses_amount: string;
  timeline: TimelineEvent[];
  pedigree: PedigreeNode;
}

export interface DashboardCards {
  total_goats: number;
  does: number;
  bucks: number;
  kids_under_6_months: number;
  bred_count: number;
  purchased_count: number;
  pregnant_now: number;
  due_next_30_days: number;
  kids_born_this_year: number;
  expired_count: number;
  sold_count: number;
}

export interface NamedCount {
  label: string;
  value: number;
}

export interface TrendPoint {
  period: string;
  label: string;
  value: number;
}

export interface TopDoe {
  goat_id: string;
  tag_number: string;
  name: string | null;
  kids: number;
}

export interface UpcomingKidding {
  crossing_id: string;
  goat_id: string;
  tag_number: string;
  name: string | null;
  expected_kidding_date: string;
  days_remaining: number;
  is_overdue: boolean;
}

export interface Dashboard {
  cards: DashboardCards;
  herd_growth: TrendPoint[];
  births_per_month: TrendPoint[];
  sex_distribution: NamedCount[];
  breed_distribution: NamedCount[];
  top_does: TopDoe[];
  monthly_expenses: TrendPoint[];
  upcoming_kiddings: UpcomingKidding[];
  balance: Balance;
  currency_symbol: string;
}

export interface FarmSettings {
  farm_prefix: string;
  gestation_days: number;
  currency_code: string;
  currency_symbol: string;
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export type GoatUpdate = Partial<Omit<GoatCreate, "crossing_id">> & {
  status?: GoatStatus;
};

export interface LinkParentsInput {
  dam_id?: string | null;
  sire_id?: string | null;
}

export interface ExpireGoatInput {
  expired_on?: string | null;
  death_cause?: string | null;
}

export interface CrossingCreate {
  dam_id: string;
  sire_id?: string | null;
  crossing_date: string;
  expected_kidding_date?: string | null;
  notes?: string | null;
}

export interface CrossingUpdate {
  sire_id?: string | null;
  crossing_date?: string | null;
  expected_kidding_date?: string | null;
  status?: CrossingStatus;
  notes?: string | null;
}

export interface RecordKiddingInput {
  actual_kidding_date: string;
  number_of_kids: number;
  notes?: string | null;
}

export interface VaccinationCreate {
  goat_id: string;
  vaccine_name: string;
  date_administered: string;
  dose?: string | null;
  notes?: string | null;
}

export interface WeightCreate {
  goat_id: string;
  weight_kg: string;
  measured_on: string;
  notes?: string | null;
}

export interface HealthRecordCreate {
  goat_id: string;
  record_date: string;
  type: HealthRecordType;
  description: string;
  medication?: string | null;
  notes?: string | null;
}

export interface ExpenseCreate {
  expense_date: string;
  name: string;
  amount: string;
  paid_by?: string | null;
  goat_id?: string | null;
  category?: string | null;
  notes?: string | null;
}

export type ExpenseUpdate = Partial<ExpenseCreate>;

export interface SettleUpInput {
  amount?: string | null;
  settled_on?: string | null;
  note?: string | null;
}
