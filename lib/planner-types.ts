export const ACTIVITY_STATUSES = ["planned", "in_progress", "done", "blocked"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const HORIZON_OPTIONS = [2, 4, 6, 8] as const;
export type HorizonWeeks = (typeof HORIZON_OPTIONS)[number];

export interface PlannerActivity {
  id: string;
  crew_id: string;
  crew_name?: string;
  name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: ActivityStatus;
  drainer_section_id: string;
  drainer_segment_id: string | null;
  progress_percent: number;
  notes: string | null;
  wbs_code: string | null;
  is_baseline: boolean;
  parent_activity_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlannerPeopleLeave {
  id: string;
  crew_id: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  person_name: string | null;
  created_at: string;
}

export interface UpdateActivityPayload {
  id: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: ActivityStatus;
  notes?: string | null;
  wbs_code?: string | null;
  sort_order?: number;
  progress_percent?: number;
  drainer_section_id?: string | null;
  drainer_segment_id?: string | null;
}

