import axios from "axios";
import { create } from "zustand";
import { User } from "@prisma/client";

interface TrainersStore {
  trainers: User[];
  loading: boolean;
  fetchTrainers: () => void;
}
const useTrainersStore = create<TrainersStore>((set) => ({
  trainers: [],
  loading: false,
  fetchTrainers: async () => {
    set({ loading: true });

    try {
      const { data } = await axios.get<{ data: User[] }>("/api/trainers");
      set({ trainers: data.data, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },
}));

export default useTrainersStore;
