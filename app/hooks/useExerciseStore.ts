import { ExerciseList } from "@prisma/client";
import axios from "axios";
import { create } from "zustand";

interface ExercisesStore {
  exercises: ExerciseList[];
  loading: boolean;
  fetchExercises: () => void;
  refetch: () => void;
}

const useExerciseStore = create<ExercisesStore>((set) => ({
  exercises: [],
  loading: true,
  fetchExercises: async () => {
    try {
      const { data } = await axios.get<{ data: ExerciseList[] }>(
        "/api/fitness/exercises/definitions"
      );
      set({ exercises: data.data });
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      set({ loading: false });
    }
  },
  refetch: async () => {
    set({ loading: false });
    await useExerciseStore.getState().fetchExercises();
  },
}));

export default useExerciseStore;
