import { Fees } from "@prisma/client";

type UserType = "admin" | "trainer" | "user";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserType;
};

// Type Diet

export type DietFood = {
  id: string;
  dietFoodName: string;
  breakfast: boolean;
  morningMeal: boolean;
  lunch: boolean;
  eveningSnack: boolean;
  dinner: boolean;
};

export type DietStore = {
  dietFoods: Record<string, DietFood>;
  addDietFood: (foodId: string, dietFoodName: string) => void;
  removeDietFood: (foodId: string) => void;
  updateDietFood: (
    foodId: string,
    dietFoodName: string,
    field: keyof DietFood,
    value: boolean
  ) => void;
};

export type CustomizedExercise = {
  id: string;
  exerciseName: string;
  sets: number;
  steps: number;
  kg: number;
  rest: number;
};