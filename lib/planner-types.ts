export type PlannerActivity = {
  id: string;
  crew_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  sort_order?: number;
  progress_percent?: number;
};

export type PlannerCrew = {
  id: string;
  name: string;
};

export type PlannerActivitiesResponse = PlannerActivity[];

export type PlannerCrewsResponse = {
  crews: PlannerCrew[];
};
