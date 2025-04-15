"use client"
import type React from "react"
import { useState, useMemo, useEffect } from "react"
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
} from "@mui/material"
import {
  Search,
  Delete,
  Refresh,
  PersonAdd,
  CheckCircle,
  Cancel,
  FilterList,
  MoreVert,
  Edit,
  Visibility,
  Download,
  Menu as MenuIcon,
} from "@mui/icons-material"
import axios from "axios"
import type { User } from "@prisma/client"
import useSWR from "swr"
// Eliminamos la importación de useTrainersStore

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

const ManageUser: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const isTablet = useMediaQuery(theme.breakpoints.down("md"))
  
  // Reemplazo del useTrainersStore con estado local y SWR
  const [trainerLoading, setTrainerLoading] = useState<boolean>(false)
  
  // State and data fetching using useSWR
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [orderBy, setOrderBy] = useState<keyof User>("name")
  const [order, setOrder] = useState<"asc" | "desc">("asc")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterRole, setFilterRole] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false)
  const [snackbarMessage, setSnackbarMessage] = useState<string>("")
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error" | "info" | "warning">("success")
  const [filtersOpen, setFiltersOpen] = useState<boolean>(!isMobile) // Por defecto cerrado en móvil
  const [addUserDialogOpen, setAddUserDialogOpen] = useState<boolean>(false)

  const { data, isLoading, mutate } = useSWR(`/api/users?page=${currentPage}&limit=${rowsPerPage}`, fetcher)
  
  // Usamos SWR para cargar los entrenadores - reemplaza la funcionalidad de useTrainersStore
  const { data: trainersData, isLoading: isTrainersLoading, mutate: mutateTrainers } = useSWR('/api/trainers', fetcher, {
    onSuccess: () => setTrainerLoading(false),
    onError: () => setTrainerLoading(false)
  })
  
  // Array de entrenadores extraído de trainersData
  const trainers = useMemo(() => trainersData?.data || [], [trainersData])

  // Reemplaza la función fetchTrainers de useTrainersStore
  const fetchTrainers = async () => {
    setTrainerLoading(true)
    await mutateTrainers()
  }

  useEffect(() => {
    fetchTrainers()
  }, [])

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

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      // Aquí iría la llamada a la API para eliminar el usuario
      // const res = await axios.delete(`/api/users/${userToDelete}`);

      // Simulamos una respuesta exitosa
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

  const handleFilterStatusChange = (event: any) => {
    setFilterStatus(event.target.value as string)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setFilterRole("")
    setFilterStatus("")
  }

  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen)
  }

  // Memoized filtered and sorted data
  const filteredAndSortedData = useMemo(() => {
    if (!data?.data) return []

    let filtered = data.data.filter((user: User) => user.role !== "admin")

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user: User) =>
          user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower),
      )
    }

    // Apply role filter
    if (filterRole) {
      filtered = filtered.filter((user: User) => user.role === filterRole)
    }

    // Apply status filter
    if (filterStatus) {
      const isActive = filterStatus === "online"
      filtered = filtered.filter((user: User) => user.isActive === isActive)
    }

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
  }, [data, orderBy, order, searchTerm, filterRole, filterStatus])

  useEffect(() => {
    mutate()
  }, [currentPage, rowsPerPage, mutate])

  // Función para mapear roles a nombres más amigables
  const getRoleName = (role: string): string => {
    const roleMap: Record<string, string> = {
      user: "Usuario",
      employee: "Empleado",
      court_manager: "Gestor de pista",
      member: "Miembro"
    };
    return roleMap[role] || role;
  };

  // Función para determinar el color del chip de rol
  const getRoleColor = (role: string): "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default" => {
    const roleColorMap: Record<string, any> = {
      user: "default",
      employee: "info",
      court_manager: "secondary",
      member: "primary"
    };
    return roleColorMap[role] || "default";
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={styles.headerContainer}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
              Panel de Administración de Usuarios
            </Typography>
            <Typography variant="body1" color="rgba(255,255,255,0.8)" sx={{ mb: 1 }}>
              Gestiona todos los usuarios, asigna entrenadores y administra roles
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PersonAdd />}
              onClick={() => setAddUserDialogOpen(true)}
              sx={{
                ...styles.actionButton,
                backgroundColor: "white",
                color: "#2a3f54",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.9)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
                }
              }}
            >
              Añadir Usuario
            </Button>
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
                </Select>
              </FormControl>

              <FormControl size="small" variant="outlined" sx={{ minWidth: { xs: "100%", sm: "200px" } }}>
                <InputLabel id="status-filter-label">Estado</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={filterStatus}
                  onChange={handleFilterStatusChange}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                </Select>
              </FormControl>
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
                <TableCell sx={styles.tableHeaderCell}>Estado</TableCell>
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
                      Prueba a cambiar los filtros o añade un nuevo usuario
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
                      <Chip
                        icon={user?.isActive ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                        label={user?.isActive ? "Online" : "Offline"}
                        color={user?.isActive ? "success" : "default"}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          transition: "all 0.2s ease",
                          bgcolor: user?.isActive ? "rgba(46, 204, 113, 0.1)" : "rgba(200, 200, 200, 0.2)",
                          "& .MuiChip-icon": {
                            color: user?.isActive ? "#2ecc71" : "#bdc3c7"
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {user?.role === "user" ? (
                        <FormControl fullWidth size="small" variant="outlined">
                          <Select
                            value={user?.trainerId ?? ""}
                            onChange={(event) => handleChangeTrainer(event.target.value as string, user?.id)}
                            displayEmpty
                            sx={{
                              borderRadius: "8px",
                              fontSize: "0.875rem",
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(0, 0, 0, 0.12)",
                              },
                            }}
                          >
                            <MenuItem value="" disabled>
                              <Typography variant="body2" color="text.secondary">Seleccionar entrenador</Typography>
                            </MenuItem>
                            {trainers?.map((trainer) => (
                              <MenuItem key={trainer.id} value={trainer.id}>
                                {trainer.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No aplicable</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleName(user?.role)}
                        color={getRoleColor(user?.role)}
                        variant="outlined"
                        size="small"
                        sx={{ 
                          textTransform: "capitalize",
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Ver detalles" arrow>
                          <IconButton
                            color="primary"
                            size="small"
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
                              setUserToDelete(user.id)
                              setDeleteDialogOpen(true)
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)"
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Delete color="error" />
            <Typography variant="h6">¿Confirmar eliminación?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ mb: 1 }}>
            Esta acción eliminará permanentemente al usuario del sistema y no podrá ser recuperado.
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta acción no se puede deshacer
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ 
              borderRadius: "8px", 
              textTransform: "none",
              px: 3
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteUser}
            color="error"
            variant="contained"
            sx={{ 
              borderRadius: "8px", 
              textTransform: "none",
              px: 3
            }}
            autoFocus
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