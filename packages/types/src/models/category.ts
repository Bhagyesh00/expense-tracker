export interface Category {
  id: string;
  workspace_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  is_system: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
