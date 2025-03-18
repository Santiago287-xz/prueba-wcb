import { CustomizedExercise } from "@/types";
import { create } from "zustand";

type ExerciseStore = {
  customizedExercises: Record<string, CustomizedExercise>;
  addCustomizedExercise: (exerciseId: string, exerciseName: string) => void;
  removeCustomizedExercise: (exerciseId: string) => void;
  updateCustomizedExercise: (
    exerciseId: string,
    exerciseName: string,
    field: keyof CustomizedExercise,
    value: number
  ) => void;
};

const useExerciseStore = create<ExerciseStore>((set) => ({
  customizedExercises: {},
  addCustomizedExercise: (exerciseId, exerciseName) =>
    set((state) => ({
      customizedExercises: {
        ...state.customizedExercises,
        [exerciseId]: {
          id: exerciseId,
          exerciseName: exerciseName,
          sets: 0,
          steps: 0,
          kg: 0,
          rest: 0,
        },
      },
    })),
  removeCustomizedExercise: (exerciseId) =>
    set((state) => {
      const { [exerciseId]: removed, ...customizedExercises } =
        state.customizedExercises;
      return { customizedExercises };
    }),
  updateCustomizedExercise: (exerciseId, exerciseName, field, value) =>
    set((state) => ({
      customizedExercises: {
        ...state.customizedExercises,
        [exerciseId]: {
          ...state.customizedExercises[exerciseId],
          id: exerciseId,
          exerciseName: exerciseName,
          [field]: value,
        },
      },
    })),
}));

export default useExerciseStore;
