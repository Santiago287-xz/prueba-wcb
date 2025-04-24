"use client"

import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Container,
  useMediaQuery,
  useTheme,
  Theme,
} from "@mui/material";
import axios from "axios";
import type { User } from "@prisma/client";
import useSWR from "swr";

import Header from "@/app/components/MembersManager/Header";
import Filters from "@/app/components/MembersManager/Filters";
import UserTable from "@/app/components/MembersManager/Table";
import UserDetails from "@/app/components/MembersManager/Details";
import EditExerciseDialog from "@/app/components/MembersManager/EditExerciseDialog";
import DeleteExerciseDialog from "@/app/components/MembersManager/DeleteExerciseDialog";
import DeleteUserDialog from "@/app/components/MembersManager/DeleteUserDialog";
import NotificationSnackbar from "@/app/components/MembersManager/NotificationSnackbar";
import { UserDetails as UserDetailsType, EditExerciseData, UserExercise } from "@/app/types/members";

// Definición de tipos para SWR
interface UserApiResponse {
  data: User[];
  count: number;
  pagination: {
    current: number;
    last: number;
    total: number;
  }
}

interface TrainerApiResponse {
  data: User[];
}

// Definición de estilos personalizados
const styles = {
  headerContainer: {
    background: "linear-gradient(145deg, #2a3f54 0%, #1a2a3a 100%)",
    borderRadius: "16px",
    color: "white",
    padding: "20px 24px",
    marginBottom: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
  },
  tableContainer: {
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
    },
  },
  tableHeaderCell: {
    fontWeight: 600,
    color: "#2a3f54",
    backgroundColor: "#f8f9fa",
    padding: "16px",
  },
  tableRow: {
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(63, 81, 181, 0.04)",
    },
  },
  actionButton: {
    borderRadius: "10px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
    padding: "8px 16px",
    transition: "all 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
  },
  filterBox: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  searchField: {
    backgroundColor: "white",
    borderRadius: "12px",
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#e0e0e0',
      },
      '&:hover fieldset': {
        borderColor: '#3f51b5',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#3f51b5',
      },
    },
  },
  userAvatar: {
    width: 36,
    height: 36,
    marginRight: 2,
    backgroundColor: (theme: Theme) => theme.palette.primary.main,
    fontWeight: "bold",
  },
  detailsDialog: {
    borderRadius: "16px",
    overflow: "hidden",
  },
  exerciseItem: {
    borderRadius: "8px",
    marginBottom: "8px",
    backgroundColor: "#f5f9ff",
    "&:hover": {
      backgroundColor: "#edf4ff",
    },
  },
};

// Custom data fetching function using SWR and Axios
const fetcher = async (...args: Parameters<typeof axios>) => {
  try {
    const res = await axios(...args);
    return res.data;
  } catch (error) {
    console.error("Error en fetcher:", error);
    throw error;
  }
};

// Helper para generar las iniciales de un nombre
const getInitials = (name: string): string => {
  if (!name) return "?";
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const ManageUser: React.FC = () => {
  const router = useRouter();
  const sessionData = useSession().data;
  const sessionUser = sessionData?.user;
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [trainerLoading, setTrainerLoading] = useState<boolean>(false);

  // State and data fetching using useSWR
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [orderBy, setOrderBy] = useState<keyof User>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error" | "info" | "warning">("success");
  const [filtersOpen, setFiltersOpen] = useState<boolean>(!isMobile); // Por defecto cerrado en móvil
  
  // User details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetailsType | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Exercise dialogs state
  const [editExerciseDialogOpen, setEditExerciseDialogOpen] = useState<boolean>(false);
  const [deleteExerciseDialogOpen, setDeleteExerciseDialogOpen] = useState<boolean>(false);
  const [loadingExerciseEdit, setLoadingExerciseEdit] = useState<boolean>(false);
  const [loadingExerciseDelete, setLoadingExerciseDelete] = useState<boolean>(false);
  const [editExerciseData, setEditExerciseData] = useState<EditExerciseData>({
    id: "",
    exerciseName: "",
    sets: 0,
    reps: 0,
    weight: 0
  });

  // Si el usuario es un entrenador, automáticamente filtrar por miembros
  useEffect(() => {
    if (sessionUser?.role === "trainer") {
      setFilterRole("member");
    }
  }, [sessionUser]);

  // Usamos SWR con los filtros aplicados
  const { data, isLoading, mutate } = useSWR<UserApiResponse>(
    `/api/members/assigned?page=${currentPage}&limit=${rowsPerPage}&role=${filterRole}&search=${searchTerm}`, 
    fetcher
  )

  // Array de entrenadores extraído de trainersData
  const { data: trainersData, isLoading: isTrainersLoading, mutate: mutateTrainers } = useSWR<TrainerApiResponse>(
    '/api/rfid/trainers', 
    fetcher, 
    {
      onSuccess: () => setTrainerLoading(false),
      onError: (err) => {
        console.error("Error al cargar entrenadores:", err);
        setTrainerLoading(false);
      }
    }
  )
  const trainers = useMemo(() => trainersData?.data || [], [trainersData]);

  // Cargar entrenadores al iniciar
  const fetchTrainers = async () => {
    setTrainerLoading(true);
    await mutateTrainers();
  }

  useEffect(() => {
    fetchTrainers();
  }, []);

  // Obtener detalles del usuario
  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      // Obtener detalles del usuario
      const userResponse = await axios.get(`/api/members?memberId=${userId}`);
      
      // Obtener ejercicios asignados al usuario
      const exercisesResponse = await axios.get(`/api/fitness/exercise/user-exercises/${userId}`);
      
      setUserDetails({
        ...userResponse.data,
        exercises: exercisesResponse.data?.data || []
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      showSnackbar("Error al cargar los detalles del usuario", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenDetails = (userId: string) => {
    setSelectedUser(userId);
    setDetailsDialogOpen(true);
    fetchUserDetails(userId);
  };

  // Editar ejercicio
  const handleEditExercise = (exerciseId: string) => {
    const exercise = userDetails?.exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      setEditExerciseData({
        id: exercise.id,
        exerciseName: exercise.exerciseName,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight
      });
      setEditExerciseDialogOpen(true);
    }
  };

  const handleSaveExercise = async () => {
    setLoadingExerciseEdit(true);
    try {
      await axios.patch(`/api/fitness/exercise/${editExerciseData.id}`, editExerciseData);
      showSnackbar("Ejercicio actualizado correctamente", "success");
      if (selectedUser) {
        fetchUserDetails(selectedUser);
      }
      setEditExerciseDialogOpen(false);
    } catch (error) {
      showSnackbar("Error al actualizar ejercicio", "error");
    } finally {
      setLoadingExerciseEdit(false);
    }
  };

  // Eliminar ejercicio
  const handleDeleteExercise = (exerciseId: string) => {
    setEditExerciseData({...editExerciseData, id: exerciseId});
    setDeleteExerciseDialogOpen(true);
  };

  const handleConfirmDeleteExercise = async () => {
    setLoadingExerciseDelete(true);
    try {
      await axios.delete(`/api/fitness/exercise/${editExerciseData.id}`);
      showSnackbar("Ejercicio eliminado correctamente", "success");
      if (selectedUser) {
        fetchUserDetails(selectedUser);
      }
      setDeleteExerciseDialogOpen(false);
    } catch (error) {
      showSnackbar("Error al eliminar ejercicio", "error");
    } finally {
      setLoadingExerciseDelete(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await axios.delete(`/api/rfid/${userToDelete}`);
      
      showSnackbar("Usuario eliminado correctamente", "success");
      await mutate();
    } catch (err) {
      showSnackbar("Error al eliminar usuario", "error");
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  }

  const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }

  const handlePageChange = (newPage: number) => {
    const lastPage = data?.pagination?.last ?? 1;
    if (newPage >= 1 && newPage <= lastPage) {
      setCurrentPage(newPage);
    }
  }

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  }

  const handleSortChange = (property: keyof User) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }

  const handleFilterRoleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFilterRole(event.target.value as string);
  }

  const resetFilters = () => {
    setSearchTerm("");
    // Si es entrenador, mantener el filtro de "member"
    if (sessionUser?.role !== "trainer") {
      setFilterRole("");
    }
  }

  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen);
  }

  // Memoized filtered and sorted data
  const filteredAndSortedData = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;

    // Si es entrenador, solo mostrar miembros
    if (sessionUser?.role === "trainer") {
      filtered = filtered.filter((user: User) => user.role === "member");
    } else {
      if (filterRole) {
        filtered = filtered.filter((user: User) => user.role === filterRole);
      }
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user: User) =>
          user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower),
      );
    }

    // Apply sorting
    return filtered.sort((a: User, b: User) => {
      const valueA = a[orderBy];
      const valueB = b[orderBy];

      if (valueA === null && valueB === null) {
        return 0;
      } else if (valueA === null) {
        return order === "asc" ? 1 : -1;
      } else if (valueB === null) {
        return order === "asc" ? -1 : 1;
      }

      if (order === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueB < valueA ? -1 : valueB > valueA ? 1 : 0;
      }
    });
  }, [data, orderBy, order, searchTerm, filterRole, sessionUser]);

  useEffect(() => {
    mutate();
  }, [currentPage, rowsPerPage, searchTerm, filterRole, mutate]);

  // Función para mapear roles a nombres más amigables
  const getRoleName = (role: string): string => {
    const roleMap: Record<string, string> = {
      receptionist: "Recepcionista",
      court_manager: "Gestor de Canchas",
      member: "Miembro",
      trainer: "Entrenador"
    };
    return roleMap[role] || role;
  };

  // Función para determinar el color del chip de rol
  const getRoleColor = (role: string): "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default" => {
    const roleColorMap: Record<string, "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default"> = {
      user: "default",
      court_manager: "secondary",
      member: "primary",
      trainer: "success"
    };
    return roleColorMap[role] || "default";
  };

  // Formatea la fecha para mostrarla en el componente
  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Función para obtener el nombre del objetivo
  const getGoalName = (goal: string): string => {
    const goalMap: Record<string, string> = {
      gain_weight: "Ganar peso",
      lose_weight: "Perder peso",
      get_fitter: "Mejorar estado físico",
      get_stronger: "Fortalecerse",
      get_healthier: "Mejorar salud",
      get_more_flexible: "Mejorar flexibilidad",
      get_more_muscular: "Ganar masa muscular",
      learn_the_basics: "Aprender lo básico"
    };
    return goalMap[goal] || goal;
  };

  // Función para obtener el nombre del nivel
  const getLevelName = (level: string): string => {
    const levelMap: Record<string, string> = {
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzado",
      expert: "Experto",
      professional: "Profesional"
    };
    return levelMap[level] || level;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Header styles={styles} />

      {/* Control Panel & Filters */}
      <Card elevation={2} sx={{ mb: 3, borderRadius: "16px", overflow: "hidden" }}>
        <Filters 
          searchTerm={searchTerm}
          handleSearchChange={handleSearchChange}
          toggleFilters={toggleFilters}
          resetFilters={resetFilters}
          filtersOpen={filtersOpen}
          filterRole={filterRole}
          handleFilterRoleChange={handleFilterRoleChange}
          sessionUser={sessionUser}
          styles={styles}
        />
      </Card>

      {/* Table */}
      <Card elevation={2} sx={styles.tableContainer}>
        <UserTable 
          data={data}
          isLoading={isLoading}
          filteredAndSortedData={filteredAndSortedData}
          handleOpenDetails={handleOpenDetails}
          setUserToDelete={setUserToDelete}
          setDeleteDialogOpen={setDeleteDialogOpen}
          orderBy={orderBy}
          order={order}
          handleSortChange={handleSortChange}
          sessionUser={sessionUser}
          getRoleName={getRoleName}
          getRoleColor={getRoleColor}
          getInitials={getInitials}
          router={router}
          styles={styles}
        />
      </Card>

      {/* User Details Dialog */}
      <UserDetails 
        detailsDialogOpen={detailsDialogOpen}
        setDetailsDialogOpen={setDetailsDialogOpen}
        userDetails={userDetails}
        loadingDetails={loadingDetails}
        selectedUser={selectedUser}
        sessionUser={sessionUser}
        router={router}
        theme={theme}
        getInitials={getInitials}
        getRoleName={getRoleName}
        getRoleColor={getRoleColor}
        getGoalName={getGoalName}
        getLevelName={getLevelName}
        formatDate={formatDate}
        handleEditExercise={handleEditExercise}
        handleDeleteExercise={handleDeleteExercise}
      />

      {/* Edit Exercise Dialog */}
      <EditExerciseDialog 
        editExerciseDialogOpen={editExerciseDialogOpen}
        setEditExerciseDialogOpen={setEditExerciseDialogOpen}
        editExerciseData={editExerciseData}
        setEditExerciseData={setEditExerciseData}
        handleSaveExercise={handleSaveExercise}
        loadingExerciseEdit={loadingExerciseEdit}
      />

      {/* Delete Exercise Dialog */}
      <DeleteExerciseDialog 
        deleteExerciseDialogOpen={deleteExerciseDialogOpen}
        setDeleteExerciseDialogOpen={setDeleteExerciseDialogOpen}
        handleConfirmDeleteExercise={handleConfirmDeleteExercise}
        loadingExerciseDelete={loadingExerciseDelete}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog 
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        handleDeleteUser={handleDeleteUser}
      />

      {/* Notification Snackbar */}
      <NotificationSnackbar 
        snackbarOpen={snackbarOpen}
        setSnackbarOpen={setSnackbarOpen}
        snackbarMessage={snackbarMessage}
        snackbarSeverity={snackbarSeverity}
      />
    </Container>
  );
};

export default ManageUser;