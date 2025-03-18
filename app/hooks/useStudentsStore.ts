import axios from "axios";
import { create } from "zustand";
import { User } from "@prisma/client";

interface StudentsStore {
  students: User[];
  loading: boolean;
  fetchStudents: () => void;
}
const useStudentsStore = create<StudentsStore>((set) => ({
  students: [],
  loading: false,
  fetchStudents: async () => {
    set({ loading: true });

    try {
      const { data } = await axios.get<{ data: User[] }>("/api/students");
      set({ students: data.data, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },
}));

export default useStudentsStore;
