"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api, type QueryParams } from "./apiClient";
import { getStoredUser } from "./authToken";
import type {
  Balance,
  Breed,
  Crossing,
  CrossingCreate,
  CrossingUpdate,
  CurrentUser,
  Dashboard,
  Expense,
  ExpenseCreate,
  ExpensePage,
  ExpenseUpdate,
  ExpireGoatInput,
  FarmSettings,
  GoatCreate,
  GoatDetail,
  GoatHistory,
  GoatSummary,
  GoatUpdate,
  HealthRecord,
  HealthRecordCreate,
  LinkParentsInput,
  MonthlyBucket,
  Page,
  Pedigree,
  Profile,
  RecordKiddingInput,
  Settlement,
  SettleUpInput,
  Vaccination,
  VaccinationCreate,
  Weight,
  WeightCreate,
} from "./types";

/**
 * Query keys are `[resource, ...scope]`. Invalidating `["goats"]` therefore
 * refreshes every goat list and detail view at once, which is what we want
 * after a write — herd counts and pedigrees ripple everywhere.
 */
export const keys = {
  settings: ["settings"] as const,
  me: ["me"] as const,
  profiles: ["profiles"] as const,
  breeds: ["breeds"] as const,
  dashboard: ["dashboard"] as const,
  goats: (params?: QueryParams) => ["goats", "list", params ?? {}] as const,
  goat: (id: string) => ["goats", "detail", id] as const,
  goatHistory: (id: string) => ["goats", "history", id] as const,
  pedigree: (id: string, generations: number) =>
    ["goats", "pedigree", id, generations] as const,
  crossings: (params?: QueryParams) => ["crossings", "list", params ?? {}] as const,
  crossing: (id: string) => ["crossings", "detail", id] as const,
  upcoming: (days: number) => ["crossings", "upcoming", days] as const,
  vaccinations: (params?: QueryParams) => ["vaccinations", "list", params ?? {}] as const,
  vaccineNames: ["vaccinations", "names"] as const,
  weights: (params?: QueryParams) => ["weights", "list", params ?? {}] as const,
  health: (params?: QueryParams) => ["health", "list", params ?? {}] as const,
  expenses: (params?: QueryParams) => ["expenses", "list", params ?? {}] as const,
  balance: ["expenses", "balance"] as const,
  monthly: (params?: QueryParams) => ["expenses", "monthly", params ?? {}] as const,
  categories: ["expenses", "categories"] as const,
  settlements: (params?: QueryParams) => ["settlements", "list", params ?? {}] as const,
};

/** Reference data barely changes; hold it for the session. */
const STATIC = { staleTime: 10 * 60 * 1000 };
/** Lists swap pages without flashing a skeleton over already-good data. */
const LIST = { placeholderData: keepPreviousData, staleTime: 30 * 1000 };

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => api.get<FarmSettings>("/settings"),
    ...STATIC,
  });
}

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<CurrentUser>("/me"),
    // AuthProvider already revalidates `/me` on mount and writes the result
    // back into this cache entry, so seeding from the same store keeps the
    // sidebar populated on first paint without a second identical request.
    initialData: getStoredUser() ?? undefined,
    ...STATIC,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: keys.profiles,
    queryFn: () => api.get<Profile[]>("/profiles"),
    ...STATIC,
  });
}

export function useBreeds() {
  return useQuery({
    queryKey: keys.breeds,
    queryFn: () => api.get<Breed[]>("/breeds"),
    ...STATIC,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api.get<Dashboard>("/dashboard/summary"),
    staleTime: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Goats
// ---------------------------------------------------------------------------

export function useGoats(params: QueryParams) {
  return useQuery({
    queryKey: keys.goats(params),
    queryFn: () => api.get<Page<GoatSummary>>("/goats", params),
    ...LIST,
  });
}

/** Picker lists: active goats only, one page, filtered by sex where relevant. */
export function useGoatOptions(sex?: "male" | "female", enabled = true) {
  const params: QueryParams = { page_size: 100, sort_by: "tag_number", sort_dir: "asc" };
  if (sex) params.sex = sex;
  return useQuery({
    queryKey: keys.goats({ ...params, picker: true }),
    queryFn: () => api.get<Page<GoatSummary>>("/goats", params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useGoat(id: string | undefined) {
  return useQuery({
    queryKey: keys.goat(id ?? ""),
    queryFn: () => api.get<GoatDetail>(`/goats/${id}`),
    enabled: Boolean(id),
  });
}

export function useGoatHistory(id: string | undefined) {
  return useQuery({
    queryKey: keys.goatHistory(id ?? ""),
    queryFn: () => api.get<GoatHistory>(`/goats/${id}/history`),
    enabled: Boolean(id),
  });
}

export function usePedigree(id: string | undefined, generations = 4) {
  return useQuery({
    queryKey: keys.pedigree(id ?? "", generations),
    queryFn: () => api.get<Pedigree>(`/goats/${id}/pedigree`, { generations }),
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// Crossings, husbandry logs
// ---------------------------------------------------------------------------

export function useCrossings(params: QueryParams) {
  return useQuery({
    queryKey: keys.crossings(params),
    queryFn: () => api.get<Page<Crossing>>("/crossings", params),
    ...LIST,
  });
}

export function useUpcomingKiddings(days = 30) {
  return useQuery({
    queryKey: keys.upcoming(days),
    queryFn: () => api.get<Crossing[]>("/crossings/upcoming", { days }),
  });
}

export function useVaccinations(params: QueryParams) {
  return useQuery({
    queryKey: keys.vaccinations(params),
    queryFn: () => api.get<Page<Vaccination>>("/vaccinations", params),
    ...LIST,
  });
}

export function useVaccineNames() {
  return useQuery({
    queryKey: keys.vaccineNames,
    queryFn: () => api.get<string[]>("/vaccinations/names"),
    ...STATIC,
  });
}

export function useWeights(params: QueryParams) {
  return useQuery({
    queryKey: keys.weights(params),
    queryFn: () => api.get<Page<Weight>>("/weights", params),
    ...LIST,
  });
}

export function useHealthRecords(params: QueryParams) {
  return useQuery({
    queryKey: keys.health(params),
    queryFn: () => api.get<Page<HealthRecord>>("/health", params),
    ...LIST,
  });
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function useExpenses(params: QueryParams) {
  return useQuery({
    queryKey: keys.expenses(params),
    queryFn: () => api.get<ExpensePage>("/expenses", params),
    ...LIST,
  });
}

export function useBalance() {
  return useQuery({ queryKey: keys.balance, queryFn: () => api.get<Balance>("/expenses/balance") });
}

export function useMonthlyExpenses(params: QueryParams = {}) {
  return useQuery({
    queryKey: keys.monthly(params),
    queryFn: () => api.get<MonthlyBucket[]>("/expenses/monthly", params),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => api.get<string[]>("/expenses/categories"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSettlements(params: QueryParams) {
  return useQuery({
    queryKey: keys.settlements(params),
    queryFn: () => api.get<Page<Settlement>>("/settlements", params),
    ...LIST,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Every mutation invalidates the resource families its write can touch.
 *
 * Adding a goat, for instance, moves herd counts on the dashboard and can fill
 * a pedigree slot, so both go stale — being generous here is much cheaper than
 * showing a stale count.
 */
function useInvalidate(...families: string[]) {
  const client = useQueryClient();
  return () =>
    Promise.all(
      families.map((family) =>
        client.invalidateQueries({ queryKey: [family], exact: false }),
      ),
    );
}

export function useCreateGoat() {
  const invalidate = useInvalidate("goats", "dashboard", "breeds");
  return useMutation({
    mutationFn: (payload: GoatCreate) => api.post<GoatDetail>("/goats", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateGoat(id: string) {
  const invalidate = useInvalidate("goats", "dashboard");
  return useMutation({
    mutationFn: (payload: GoatUpdate) => api.patch<GoatDetail>(`/goats/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useLinkParents(id: string) {
  const invalidate = useInvalidate("goats", "dashboard");
  return useMutation({
    mutationFn: (payload: LinkParentsInput) =>
      api.post<GoatDetail>(`/goats/${id}/link-parents`, payload),
    onSuccess: invalidate,
  });
}

export function useExpireGoat(id: string) {
  const invalidate = useInvalidate("goats", "crossings", "dashboard");
  return useMutation({
    mutationFn: (payload: ExpireGoatInput) =>
      api.post<GoatDetail>(`/goats/${id}/expire`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteGoat() {
  const invalidate = useInvalidate("goats", "dashboard", "breeds");
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goats/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateCrossing() {
  const invalidate = useInvalidate("crossings", "goats", "dashboard");
  return useMutation({
    mutationFn: (payload: CrossingCreate) => api.post<Crossing>("/crossings", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCrossing(id: string) {
  const invalidate = useInvalidate("crossings", "goats", "dashboard");
  return useMutation({
    mutationFn: (payload: CrossingUpdate) => api.patch<Crossing>(`/crossings/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useRecordKidding(id: string) {
  const invalidate = useInvalidate("crossings", "goats", "dashboard");
  return useMutation({
    mutationFn: (payload: RecordKiddingInput) =>
      api.post<Crossing>(`/crossings/${id}/kidding`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCrossing() {
  const invalidate = useInvalidate("crossings", "goats", "dashboard");
  return useMutation({
    mutationFn: (id: string) => api.delete(`/crossings/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateVaccination() {
  const invalidate = useInvalidate("vaccinations", "goats");
  return useMutation({
    mutationFn: (payload: VaccinationCreate) =>
      api.post<Vaccination>("/vaccinations", payload),
    onSuccess: invalidate,
  });
}

export function useDeleteVaccination() {
  const invalidate = useInvalidate("vaccinations", "goats");
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vaccinations/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateWeight() {
  const invalidate = useInvalidate("weights", "goats");
  return useMutation({
    mutationFn: (payload: WeightCreate) => api.post<Weight>("/weights", payload),
    onSuccess: invalidate,
  });
}

export function useDeleteWeight() {
  const invalidate = useInvalidate("weights", "goats");
  return useMutation({
    mutationFn: (id: string) => api.delete(`/weights/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateHealthRecord() {
  const invalidate = useInvalidate("health", "goats");
  return useMutation({
    mutationFn: (payload: HealthRecordCreate) => api.post<HealthRecord>("/health", payload),
    onSuccess: invalidate,
  });
}

export function useDeleteHealthRecord() {
  const invalidate = useInvalidate("health", "goats");
  return useMutation({
    mutationFn: (id: string) => api.delete(`/health/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateExpense() {
  const invalidate = useInvalidate("expenses", "dashboard", "goats");
  return useMutation({
    mutationFn: (payload: ExpenseCreate) => api.post<Expense>("/expenses", payload),
    onSuccess: invalidate,
  });
}

export function useUpdateExpense(id: string) {
  const invalidate = useInvalidate("expenses", "dashboard");
  return useMutation({
    mutationFn: (payload: ExpenseUpdate) => api.patch<Expense>(`/expenses/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidate("expenses", "dashboard");
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: invalidate,
  });
}

export function useSettleUp() {
  const invalidate = useInvalidate("expenses", "settlements", "dashboard");
  return useMutation({
    mutationFn: (payload: SettleUpInput) =>
      api.post<Settlement>("/expenses/settle", payload),
    onSuccess: invalidate,
  });
}

export function useDeleteSettlement() {
  const invalidate = useInvalidate("expenses", "settlements", "dashboard");
  return useMutation({
    mutationFn: (id: string) => api.delete(`/settlements/${id}`),
    onSuccess: invalidate,
  });
}
