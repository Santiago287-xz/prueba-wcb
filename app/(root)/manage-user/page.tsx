"use client"
import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react";
import { SportsMartialArts } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  TablePagination,
  Button,
  Box,
  Typography,
  InputAdornment,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Alert,
  Snackbar,
  Avatar,
  LinearProgress,
  Fade,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  CircularProgress,
} from "@mui/material"
import {
  Search,
  Delete,
  Refresh,
  FilterList,
  Edit,
  Visibility,
  Download,
  FitnessCenter,
  Tag,
  CalendarToday,
  AccessTime,
} from "@mui/icons-material"
import axios from "axios"
import type { User } from "@prisma/client"
import useSWR from "swr"

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
    backgroundColor: (theme) => theme.palette.primary.main,
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
  const res = await axios(...args)
  return res.data
}

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

// Interfaces para los datos
interface UserExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  rest: number;
  assignedAt: string;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  level: string;
  exercises: UserExercise[];
}

const ManageUser = () => {
  const router = useRouter();
  const sessionData = useSession().data;
  const sessionUser = sessionData?.user;
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const [trainerLoading, setTrainerLoading] = useState<boolean>(false)

  // State and data fetching using useSWR
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [orderBy, setOrderBy] = useState<keyof User>("name")
  const [order, setOrder] = useState<"asc" | "desc">("asc")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterRole, setFilterRole] = useState<string>("")
  // Eliminado filtro de estado que no se usa en el sistema
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false)
  const [snackbarMessage, setSnackbarMessage] = useState<string>("")
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error" | "info" | "warning">("success")
  const [filtersOpen, setFiltersOpen] = useState<boolean>(!isMobile) // Por defecto cerrado en móvil
  
  // User details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false)

  // Si el usuario es un entrenador, automáticamente filtrar por miembros
  useEffect(() => {
    if (sessionUser?.role === "trainer") {
      setFilterRole("member");
    }
  }, [sessionUser]);

  // Usamos SWR con los filtros aplicados
  const { data, isLoading, mutate } = useSWR(
    `/api/users?page=${currentPage}&limit=${rowsPerPage}&role=${filterRole}&search=${searchTerm}`, 
    fetcher
  )

  // Array de entrenadores extraído de trainersData
  const { data: trainersData, isLoading: isTrainersLoading, mutate: mutateTrainers } = useSWR(
    '/api/rfid/trainers', 
    fetcher, 
    {
      onSuccess: () => setTrainerLoading(false),
      onError: () => setTrainerLoading(false)
    }
  )
  const trainers = useMemo(() => trainersData?.data || [], [trainersData])

  // Cargar entrenadores al iniciar
  const fetchTrainers = async () => {
    setTrainerLoading(true)
    await mutateTrainers()
  }

  useEffect(() => {
    fetchTrainers()
  }, [])

  // Manejar asignación de entrenador
  const handleChangeTrainer = async (trainerId: string, userId: string) => {
    try {
      const data = {
        trainerId,
        userId,
      }
      const res = await axios.patch("/api/users", data, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (res.status === 201) {
        showSnackbar("Entrenador asignado correctamente", "success")
        await mutate()
      }
    } catch (err: Error | any) {
      showSnackbar("Error al asignar entrenador", "error")
    }
  }

  // Obtener detalles del usuario
  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      // Obtener detalles del usuario
      const userResponse = await axios.get(`/api/users/${userId}`);
      
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const res = await axios.delete(`/api/users/${userToDelete}`);
      
      showSnackbar("Usuario eliminado correctamente", "success")
      await mutate()
    } catch (err) {
      showSnackbar("Error al eliminar usuario", "error")
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const handlePageChange = (newPage: number) => {
    const lastPage = data?.pagination?.last ?? 1
    if (newPage >= 1 && newPage <= lastPage) {
      setCurrentPage(newPage)
    }
  }

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage)
    setCurrentPage(1)
  }

  const handleSortChange = (property: keyof User) => () => {
    const isAsc = orderBy === property && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(property)
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleFilterRoleChange = (event: any) => {
    setFilterRole(event.target.value as string)
  }

  // Eliminada función de filtro de estado que no se usa

  const resetFilters = () => {
    setSearchTerm("")
    // Si es entrenador, mantener el filtro de "member"
    if (sessionUser?.role !== "trainer") {
      setFilterRole("")
    }
  }

  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen)
  }

  // Memoized filtered and sorted data
  const filteredAndSortedData = useMemo(() => {
    if (!data?.data) return []

    let filtered = data.data

    // Si es entrenador, solo mostrar miembros
    if (sessionUser?.role === "trainer") {
      filtered = filtered.filter((user: User) => user.role === "member")
    } else {
      // Para administradores, filtrar admin y aplicar filtros de rol si existen
      filtered = filtered.filter((user: User) => user.role !== "admin")
      if (filterRole) {
        filtered = filtered.filter((user: User) => user.role === filterRole)
      }
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user: User) =>
          user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower),
      )
    }

    // Eliminado filtro de estado

    // Apply sorting
    return filtered.sort((a: User, b: User) => {
      const valueA = a[orderBy]
      const valueB = b[orderBy]

      if (valueA === null && valueB === null) {
        return 0
      } else if (valueA === null) {
        return order === "asc" ? 1 : -1
      } else if (valueB === null) {
        return order === "asc" ? -1 : 1
      }

      if (order === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0
      } else {
        return valueB < valueA ? -1 : valueB > valueA ? 1 : 0
      }
    })
  }, [data, orderBy, order, searchTerm, filterRole, sessionUser])

  useEffect(() => {
    mutate()
  }, [currentPage, rowsPerPage, searchTerm, filterRole, mutate])

  // Función para mapear roles a nombres más amigables
  const getRoleName = (role: string): string => {
    const roleMap: Record<string, string> = {
      user: "Usuario",
      employee: "Empleado",
      court_manager: "Gestor de pista",
      member: "Miembro",
      trainer: "Entrenador"
    };
    return roleMap[role] || role;
  };

  // Función para determinar el color del chip de rol
  const getRoleColor = (role: string): "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default" => {
    const roleColorMap: Record<string, any> = {
      user: "default",
      employee: "info",
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
      <Box sx={styles.headerContainer}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
              Panel de Administración de Usuarios
            </Typography>
            <Typography variant="body1" color="rgba(255,255,255,0.8)" sx={{ mb: 1 }}>
              Gestiona todos los usuarios, asigna entrenadores y administra roles
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Control Panel & Filters */}
      <Card elevation={2} sx={{ mb: 3, borderRadius: "16px", overflow: "hidden" }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <TextField
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={handleSearchChange}
                variant="outlined"
                size="small"
                sx={{
                  ...styles.searchField,
                  width: { xs: "100%", sm: "300px" }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title="Mostrar/ocultar filtros">
                <IconButton
                  color="primary"
                  onClick={toggleFilters}
                  sx={{ ml: 1, display: { xs: 'flex', md: 'none' } }}
                >
                  <FilterList />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Exportar datos">
                <IconButton color="primary">
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Restablecer filtros">
                <IconButton onClick={resetFilters} color="primary">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Fade in={filtersOpen}>
            <Box sx={{ display: filtersOpen ? "flex" : "none", flexWrap: "wrap", gap: 2, mt: 2 }}>
              {/* Solo mostrar el filtro de rol si no es entrenador */}
              {sessionUser?.role !== "trainer" && (
                <FormControl size="small" variant="outlined" sx={{ minWidth: { xs: "100%", sm: "200px" } }}>
                  <InputLabel id="role-filter-label">Filtrar por rol</InputLabel>
                  <Select
                    labelId="role-filter-label"
                    value={filterRole}
                    onChange={handleFilterRoleChange}
                    label="Filtrar por rol"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="user">Usuario</MenuItem>
                    <MenuItem value="employee">Empleado</MenuItem>
                    <MenuItem value="court_manager">Gestor de pista</MenuItem>
                    <MenuItem value="member">Miembro</MenuItem>
                    <MenuItem value="trainer">Entrenador</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          </Fade>
        </CardContent>
      </Card>

      {/* Table */}
      <Card elevation={2} sx={styles.tableContainer}>
        {/* Loading indicator */}
        {(isLoading || isTrainersLoading) && (
          <LinearProgress color="primary" sx={{ height: "3px" }} />
        )}

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 650 }} aria-label="tabla de usuarios">
            <TableHead>
              <TableRow>
                <TableCell sx={styles.tableHeaderCell}>Usuario</TableCell>
                <TableCell sx={styles.tableHeaderCell}>
                  <TableSortLabel
                    active={orderBy === "email"}
                    direction={order}
                    onClick={handleSortChange("email")}
                  >
                    Email
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={styles.tableHeaderCell}>Entrenador</TableCell>
                <TableCell sx={styles.tableHeaderCell}>
                  <TableSortLabel
                    active={orderBy === "role"}
                    direction={order}
                    onClick={handleSortChange("role")}
                  >
                    Rol
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={styles.tableHeaderCell}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from(new Array(3)).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={6} sx={{ py: 3 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.08)", mr: 2 }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ height: 12, width: "60%", bgcolor: "rgba(0,0,0,0.08)", borderRadius: 1, mb: 1 }} />
                          <Box sx={{ height: 10, width: "40%", bgcolor: "rgba(0,0,0,0.05)", borderRadius: 1 }} />
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: "text.secondary" }}>
                      No se encontraron usuarios
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Prueba a cambiar los filtros o la búsqueda
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedData.map((user: User & { trainer: User | null }, i: number) => (
                  <TableRow
                    key={user?.id}
                    sx={styles.tableRow}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar sx={styles.userAvatar}>
                          {getInitials(user?.name || '')}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {user?.name || 'Sin nombre'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                            ID: {user?.id?.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{user?.email}</TableCell>

                    <TableCell>
                      {user?.trainer ? (
                        <Chip
                          avatar={<Avatar>{getInitials(user.trainer)}</Avatar>}
                          label={user.trainer}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            borderRadius: "6px",
                            height: "28px"
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No asignado
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleName(user?.role)}
                        size="small"
                        color={getRoleColor(user?.role)}
                        sx={{ 
                          fontWeight: 500, 
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          height: "24px"
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Ver detalles" arrow>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOpenDetails(user.id)}
                            sx={{
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "scale(1.1)",
                                backgroundColor: "rgba(63, 81, 181, 0.08)"
                              },
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {sessionUser?.role === 'trainer' ? (
                          // Para entrenadores, solo mostrar el botón de asignar ejercicios
                          <Tooltip title="Asignar ejercicios" arrow>
                            <IconButton
                              color="success"
                              size="small"
                              onClick={() => router.push(`/exercise-assignment/${user.id}`)}
                              sx={{
                                transition: "all 0.2s",
                                "&:hover": {
                                  transform: "scale(1.1)",
                                  backgroundColor: "rgba(76, 175, 80, 0.08)"
                                },
                              }}
                            >
                              <SportsMartialArts fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          // Para administradores, mostrar botones de editar y eliminar
                          <>
                            <Tooltip title="Editar usuario" arrow>
                              <IconButton
                                color="info"
                                size="small"
                                sx={{
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    transform: "scale(1.1)",
                                    backgroundColor: "rgba(3, 169, 244, 0.08)"
                                  },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Eliminar usuario" arrow>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => {
                                  setUserToDelete(user.id);
                                  setDeleteDialogOpen(true);
                                }}
                                sx={{
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    transform: "scale(1.1)",
                                    backgroundColor: "rgba(244, 67, 54, 0.08)"
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderTop: "1px solid rgba(224, 224, 224, 1)"
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2, display: { xs: "none", sm: "block" } }}>
            {data?.count ? `Total: ${data.count} usuarios` : ""}
          </Typography>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={data?.count ?? 0}
            rowsPerPage={rowsPerPage}
            page={currentPage - 1}
            onPageChange={(_event, newPage) => handlePageChange(newPage + 1)}
            onRowsPerPageChange={(event) => handleRowsPerPageChange(Number.parseInt(event.target.value, 10))}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to === -1 ? count : to} de ${count}`}
          />
        </Box>
      </Card>


{/* User Details Dialog */}
<Dialog
  open={detailsDialogOpen}
  onClose={() => setDetailsDialogOpen(false)}
  maxWidth="md"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)"
    }
  }}
>
  <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
      {userDetails ? getInitials(userDetails.name) : '...'}
    </Avatar>
    <Typography variant="h6">Detalles del Usuario</Typography>
  </DialogTitle>
  
  <DialogContent dividers>
    {loadingDetails ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    ) : userDetails ? (
      <>
        {/* Información del usuario */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información Personal
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Nombre:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2" fontWeight="medium">
                      {userDetails.name}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Email:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {userDetails.email}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Rol:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Chip 
                      label={getRoleName(userDetails.role)} 
                      color={getRoleColor(userDetails.role)}
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Género:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {userDetails.gender === 'male' ? 'Masculino' : 'Femenino'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Edad:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {userDetails.age} años
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Perfil Deportivo
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Altura:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      {userDetails.height} cm
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Peso:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      {userDetails.weight} kg
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Objetivo:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      {getGoalName(userDetails.goal)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Nivel:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      {getLevelName(userDetails.level)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Lista de ejercicios asignados */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Ejercicios Asignados
          </Typography>
          {sessionUser?.role === 'trainer' && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<SportsMartialArts />}
              onClick={() => {
                setDetailsDialogOpen(false);
                router.push(`/exercise-assignment/${selectedUser}`);
              }}
            >
              Añadir ejercicios
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {userDetails.exercises && userDetails.exercises.length > 0 ? (
          <List disablePadding>
            {userDetails.exercises.map((exercise, index) => (
              <Card key={exercise.id || index} variant="outlined" sx={{ mb: 1 }}>
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FitnessCenter color="primary" sx={{ mr: 1 }} fontSize="small" />
                        <Typography variant="subtitle2" fontWeight="bold">
                          {exercise.exerciseName}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} sm={1.5}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Series:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {exercise.sets}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} sm={1.5}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Repeticiones:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {exercise.reps}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} sm={1.5}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Peso:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {exercise.weight} kg
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} sm={2.5}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Asignado:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatDate(exercise.assignedAt)}
                      </Typography>
                    </Grid>

                    {/* Botones de acción */}
                    {sessionUser?.role === 'trainer' && (
                      <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Editar ejercicio">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditExercise(exercise.id)}
                            sx={{
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "scale(1.1)",
                                backgroundColor: "rgba(63, 81, 181, 0.08)"
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar ejercicio">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteExercise(exercise.id)}
                            sx={{
                              ml: 1,
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "scale(1.1)",
                                backgroundColor: "rgba(244, 67, 54, 0.08)"
                              }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <FitnessCenter sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              No hay ejercicios asignados
            </Typography>
            {sessionUser?.role === 'trainer' && (
              <Button
                variant="outlined"
                size="small"
                color="primary"
                startIcon={<SportsMartialArts />}
                onClick={() => {
                  setDetailsDialogOpen(false);
                  router.push(`/exercise-assignment/${selectedUser}`);
                }}
                sx={{ mt: 2 }}
              >
                Asignar ejercicios
              </Button>
            )}
          </Box>
        )}
      </>
    ) : (
      <Typography color="text.secondary">No se pudo cargar la información del usuario</Typography>
    )}
  </DialogContent>
  
  <DialogActions sx={{ px: 3, py: 2 }}>
    <Button
      variant="outlined"
      onClick={() => setDetailsDialogOpen(false)}
    >
      Cerrar
    </Button>
  </DialogActions>
</Dialog>

{/* Edit Exercise Dialog */}
<Dialog
  open={editExerciseDialogOpen}
  onClose={() => setEditExerciseDialogOpen(false)}
  maxWidth="sm"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)"
    }
  }}
>
  <DialogTitle>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Edit color="primary" />
      <Typography variant="h6">Editar Ejercicio</Typography>
    </Box>
  </DialogTitle>
  
  <DialogContent dividers>
    {loadingExerciseEdit ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    ) : (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Nombre del ejercicio"
            value={editExerciseData.exerciseName}
            onChange={(e) => setEditExerciseData({...editExerciseData, exerciseName: e.target.value})}
            fullWidth
            variant="outlined"
            margin="dense"
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Series"
            type="number"
            value={editExerciseData.sets}
            onChange={(e) => setEditExerciseData({...editExerciseData, sets: parseInt(e.target.value) || 0})}
            fullWidth
            variant="outlined"
            margin="dense"
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Repeticiones"
            type="number"
            value={editExerciseData.reps}
            onChange={(e) => setEditExerciseData({...editExerciseData, reps: parseInt(e.target.value) || 0})}
            fullWidth
            variant="outlined"
            margin="dense"
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <TextField
            label="Peso (kg)"
            type="number"
            value={editExerciseData.weight}
            onChange={(e) => setEditExerciseData({...editExerciseData, weight: parseInt(e.target.value) || 0})}
            fullWidth
            variant="outlined"
            margin="dense"
            InputProps={{ inputProps: { min: 0 } }}
          />
        </Grid>
      </Grid>
    )}
  </DialogContent>
  
  <DialogActions sx={{ px: 3, py: 2 }}>
    <Button 
      variant="outlined" 
      onClick={() => setEditExerciseDialogOpen(false)}
    >
      Cancelar
    </Button>
    <Button 
      variant="contained" 
      color="primary"
      onClick={handleSaveExercise}
      disabled={loadingExerciseEdit}
    >
      Guardar cambios
    </Button>
  </DialogActions>
</Dialog>

{/* Delete Exercise Dialog */}
<Dialog
  open={deleteExerciseDialogOpen}
  onClose={() => setDeleteExerciseDialogOpen(false)}
  maxWidth="xs"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)"
    }
  }}
>
  <DialogTitle>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Delete color="error" />
      <Typography variant="h6">Eliminar Ejercicio</Typography>
    </Box>
  </DialogTitle>
  
  <DialogContent>
    <DialogContentText id="alert-dialog-description">
      ¿Está seguro de que desea eliminar este ejercicio? Esta acción no se puede deshacer.
    </DialogContentText>
  </DialogContent>
  
  <DialogActions sx={{ px: 3, py: 2 }}>
    <Button 
      variant="outlined" 
      onClick={() => setDeleteExerciseDialogOpen(false)}
    >
      Cancelar
    </Button>
    <Button 
      variant="contained" 
      color="error"
      onClick={handleConfirmDeleteExercise}
      disabled={loadingExerciseDelete}
      startIcon={loadingExerciseDelete ? <CircularProgress size={16} /> : null}
    >
      Eliminar
    </Button>
  </DialogActions>
</Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ bottom: { xs: 16, sm: 24 } }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: "100%",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            borderRadius: "10px"
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default ManageUser