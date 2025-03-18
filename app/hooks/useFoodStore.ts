import { create } from "zustand";
import { DietFoodList } from "@prisma/client";
import axios from "axios";

interface FoodStore {
  foods: DietFoodList[];
  loading: boolean;
  fetchFoods: () => void;
  refetch: () => void;
}

const useFoodStore = create<FoodStore>((set) => ({
  foods: [],
  loading: true,
  fetchFoods: async () => {
    try {
      const { data } = await axios.get<{ data: DietFoodList[] }>(
        "/api/diet/manage-foods"
      );
      set({ foods: data.data });
    } catch (error) {
    } finally {
      set({ loading: false });
    }
  },
  refetch: async () => {
    set({ loading: false });
    await useFoodStore.getState().fetchFoods();
  },
}));

export default useFoodStore;
