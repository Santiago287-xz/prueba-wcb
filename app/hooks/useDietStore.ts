import { DietStore } from "@/types";
import { create } from "zustand";

const useDietStore = create<DietStore>((set) => ({
  dietFoods: {},
  addDietFood: (foodId, dietFoodName) =>
    set((state) => ({
      dietFoods: {
        ...state.dietFoods,
        [foodId]: {
          id: foodId,
          dietFoodName: dietFoodName,
          breakfast: false,
          morningMeal: false,
          lunch: false,
          eveningSnack: false,
          dinner: false,
        },
      },
    })),
  removeDietFood: (foodId) =>
    set((state) => {
      const { [foodId]: removed, ...dietFoods } = state.dietFoods;
      return { dietFoods };
    }),
  updateDietFood: (foodId, dietFoodName, field, value) =>
    set((state) => ({
      dietFoods: {
        ...state.dietFoods,
        [foodId]: {
          ...state.dietFoods[foodId],
          id: foodId,
          dietFoodName: dietFoodName,
          [field]: value,
        },
      },
    })),
}));

export default useDietStore;
