// Import result from backend
export interface ImportResult {
  rows_read: number;
  rows_saved: number;
  rows_skipped: number;
  errors?: RowError[];
}

export interface RowError {
  row: number;
  reason: string;
}

// CATMAT search types
export interface CatmatSearchItem {
  id: number;
  group_code: number;
  group_name: string;
  class_code: number;
  class_name: string;
  pdm_code: number;
  pdm_name: string;
  item_code: number;
  item_description: string;
  ncm_code?: string;
  rank: number;
}

export interface CatmatSearchResponse {
  data: CatmatSearchItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CatmatSearchParams {
  q?: string;
  group_code?: number;
  class_code?: number;
  pdm_code?: number;
  ncm_code?: string;
  limit?: number;
  offset?: number;
}

// CATSER search types
export interface CatserSearchItem {
  id: number;
  material_service_type: string;
  group_code: number;
  group_name: string;
  class_code: number;
  class_name: string;
  service_code: number;
  service_description: string;
  status: string;
  rank: number;
}

export interface CatserSearchResponse {
  data: CatserSearchItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CatserSearchParams {
  q?: string;
  group_code?: number;
  class_code?: number;
  service_code?: number;
  status?: string;
  limit?: number;
  offset?: number;
}
