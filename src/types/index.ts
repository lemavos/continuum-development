// Types matching Java backend POJOs exactly

export type Plan = "FREE" | "PLUS" | "PRO" | "GOLD";

export interface User {
  id: string;
  email: string;
  username: string;
  plan: Plan;
  emailVerified: boolean;
  createdAt: string;
}

export interface PlanLimits {
  maxEntities: number;
  maxNotes: number;
  maxHabits: number;
  historyDays: number;
  maxVaultSizeMB: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { maxEntities: 20, maxNotes: 50, maxHabits: 3, historyDays: 30, maxVaultSizeMB: 100 },
  PLUS: { maxEntities: 100, maxNotes: 500, maxHabits: 10, historyDays: 180, maxVaultSizeMB: 1024 },
  PRO: { maxEntities: -1, maxNotes: -1, maxHabits: -1, historyDays: 730, maxVaultSizeMB: 2048 },
  GOLD: { maxEntities: -1, maxNotes: -1, maxHabits: -1, historyDays: -1, maxVaultSizeMB: 4096 },
};

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId?: string;
  entityIds: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
}

export type EntityType = "PERSON" | "PROJECT" | "TOPIC" | "ORGANIZATION" | "HABIT";

export interface Entity {
  id: string;
  title: string;
  type: EntityType;
  description?: string;
  trackingDates?: string[];
  createdAt: string;
  ownerId: string;
}

export interface HeatmapData {
  [date: string]: number;
}

export interface EntityStats {
  currentStreak: number;
  totalCompletions: number;
  longestStreak: number;
}

export interface DashboardMetrics {
  totalNotes: number;
  totalEntities: number;
  totalHabits: number;
  notesThisWeek: number;
  currentStreak: number;
  completedToday: number;
}

export interface Subscription {
  id: string;
  plan: Plan;
  status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING";
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface VaultFile {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export interface UserUsage {
  notesCount: number;
  entitiesCount: number;
  habitsCount: number;
  vaultSizeMB: number;
}
