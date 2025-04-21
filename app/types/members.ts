import { User } from "@prisma/client";
import { type AppRouterInstance } from "next/dist/shared/lib/app-router-context";
import { Theme } from "@mui/material";

export interface UserExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  duration?: number;
  notes?: string;
  assignedAt: string;
}

export interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  level: string;
  exercises: UserExercise[];
}

export interface EditExerciseData {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface FiltersProps {
  searchTerm: string;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  toggleFilters: () => void;
  resetFilters: () => void;
  filtersOpen: boolean;
  filterRole: string;
  handleFilterRoleChange: (event: any) => void;
  sessionUser: any;
  styles: any;
}

export interface UserTableProps {
  data: any;
  isLoading: boolean;
  filteredAndSortedData: User[];
  handleOpenDetails: (userId: string) => void;
  setUserToDelete: (userId: string | null) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  orderBy: keyof User;
  order: "asc" | "desc";
  handleSortChange: (property: keyof User) => () => void;
  sessionUser: any;
  getRoleName: (role: string) => string;
  getRoleColor: (role: string) => "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default";
  getInitials: (name: string) => string;
  router: AppRouterInstance;
  styles: any;
}

export interface UserDetailsProps {
  detailsDialogOpen: boolean;
  setDetailsDialogOpen: (open: boolean) => void;
  userDetails: UserDetails | null;
  loadingDetails: boolean;
  selectedUser: string | null;
  sessionUser: any;
  router: AppRouterInstance;
  theme: Theme;
  getInitials: (name: string) => string;
  getRoleName: (role: string) => string;
  getRoleColor: (role: string) => "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default";
  getGoalName: (goal: string) => string;
  getLevelName: (level: string) => string;
  formatDate: (dateString: string) => string;
  handleEditExercise: (exerciseId: string) => void;
  handleDeleteExercise: (exerciseId: string) => void;
}

export interface UserExercisesProps {
  exercises: UserExercise[];
  sessionUser: any;
  selectedUser: string | null;
  setDetailsDialogOpen?: (open: boolean) => void;
  router: AppRouterInstance;
  formatDate: (dateString: string) => string;
  handleEditExercise: (exerciseId: string) => void;
  handleDeleteExercise: (exerciseId: string) => void;
}

export interface EditExerciseDialogProps {
  editExerciseDialogOpen: boolean;
  setEditExerciseDialogOpen: (open: boolean) => void;
  editExerciseData: EditExerciseData;
  setEditExerciseData: React.Dispatch<React.SetStateAction<EditExerciseData>>;
  handleSaveExercise: () => Promise<void>;
  loadingExerciseEdit: boolean;
}

export interface DeleteExerciseDialogProps {
  deleteExerciseDialogOpen: boolean;
  setDeleteExerciseDialogOpen: (open: boolean) => void;
  handleConfirmDeleteExercise: () => Promise<void>;
  loadingExerciseDelete: boolean;
}