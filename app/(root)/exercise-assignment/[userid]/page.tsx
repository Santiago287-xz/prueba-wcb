"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Checkbox, 
  FormControlLabel, 
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Chip,
  Tooltip,
  InputAdornment,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from "@mui/material";
import { 
  Delete, 
  Search, 
  FilterList, 
  FitnessCenter, 
  ArrowBackIos, 
  Add, 
  Remove 
} from "@mui/icons-material";
import axios from "axios";
import toast from "react-hot-toast";

// Estilos personalizados
const styles = {
  headerContainer: {
    background: "linear-gradient(145deg, #2a3f54 0%, #1a2a3a 100%)",
    borderRadius: "16px",
    color: "white",
    padding: "20px 24px",
    marginBottom: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
  },
  userInfoContainer: {
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userAvatar: {
    width: 42,
    height: 42,
    backgroundColor: "white",
    color: "#2a3f54",
    fontWeight: "bold",
  },
  tableContainer: {
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
  },
  exerciseCard: {
    borderRadius: "12px",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.08)",
    },
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
  labelText: {
    color: "#666",
    fontWeight: 500,
    fontSize: "0.875rem",
  },
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

export default function AssignExercisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { userId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    
    if (status === "authenticated" && session.user.role !== "trainer" && session.user.role !== "admin") {
      router.push("/unauthorized");
      return;
    }
    
    fetchData();
  }, [status, session, router, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener detalles del usuario
      const userResponse = await axios.get(`/api/users/${userId}`);
      setUser(userResponse.data);
      // Obtener la lista de ejercicios disponibles
      const exercisesResponse = await axios.get('/api/exercise/manage-exercise');
      setAvailableExercises(exercisesResponse.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExerciseSelection = (exerciseId) => {
    setSelectedExercises(prev => {
      const isSelected = prev.some(ex => ex.id === exerciseId);
      if (isSelected) {
        return prev.filter(ex => ex.id !== exerciseId);
      } else {
        const exercise = availableExercises.find(ex => ex.id === exerciseId);
        return [...prev, {
          id: exercise.id,
          exerciseName: exercise.name,
          sets: 3,
          steps: 10,
          kg: 0,
          rest: 60
        }];
      }
    });
  };

  const handleExerciseDataChange = (exerciseId, field, value) => {
    setSelectedExercises(prev =>
      prev.map(ex =>
        ex.id === exerciseId ? { ...ex, [field]: parseInt(value) || 0 } : ex
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedExercises.length === 0) {
      toast.error("Por favor, selecciona al menos un ejercicio");
      return;
    }
    
    const requestBody = {
      selectedStudents: [userId],
      workOutArray: selectedExercises, 
      fromDate: formData.fromDate,
      toDate: formData.toDate
    };
    
    setSubmitting(true);
    
    try {
      const response = await axios.post('/api/exercise/assign-exercise', requestBody);
      
      toast.success("Ejercicios asignados correctamente");
      router.push('/manage-user');
    } catch (err) {
      console.error("Error assigning exercises:", err);
      toast.error(`Error al asignar ejercicios: ${err.response?.data?.error || 'Error desconocido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrar ejercicios disponibles
  const filteredExercises = availableExercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || (exercise.category === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas
  const categories = [...new Set(availableExercises.map(ex => ex.category).filter(Boolean))];
  
  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={() => router.push('/manage-user')} sx={{ mt: 2 }}>
          Volver a Gestión de Usuarios
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header con información del usuario */}
      <Box sx={styles.headerContainer}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIos />} 
          onClick={() => router.push('/manage-user')}
          sx={{ 
            color: 'white', 
            borderColor: 'rgba(255,255,255,0.3)', 
            mb: 2,
            '&:hover': { 
              borderColor: 'white', 
              backgroundColor: 'rgba(255,255,255,0.1)' 
            } 
          }}
        >
          Volver a usuarios
        </Button>
        
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Asignar Ejercicios
        </Typography>
        
        {user && (
          <Box sx={styles.userInfoContainer}>
            <Avatar sx={styles.userAvatar}>
              {getInitials(user.name)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {user.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {user.email}
              </Typography>
            </Box>
            <Chip 
              label={user.isActive ? "Online" : "Offline"} 
              size="small" 
              color={user.isActive ? "success" : "default"}
              sx={{ ml: 'auto', borderRadius: '6px' }} 
            />
          </Box>
        )}
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Periodo de asignación
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de inicio"
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de fin"
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Grid>
          </Grid>
        </Paper>
        
        <Paper elevation={3} sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Ejercicios Disponibles
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="Buscar ejercicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={styles.searchField}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <Tooltip title="Filtros">
                <IconButton onClick={() => setFiltersOpen(!filtersOpen)}>
                  <FilterList />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Collapse in={filtersOpen}>
            <Box sx={{ mb: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: '10px' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Filtrar por categoría</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Filtrar por categoría"
                >
                  <MenuItem value="">Todas las categorías</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Collapse>
          
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {filteredExercises.map(exercise => (
              <Grid item xs={12} sm={6} md={4} key={exercise.id}>
                <Card 
                  variant={selectedExercises.some(ex => ex.id === exercise.id) ? "elevation" : "outlined"}
                  elevation={selectedExercises.some(ex => ex.id === exercise.id) ? 3 : 0}
                  sx={{ 
                    ...styles.exerciseCard,
                    borderColor: selectedExercises.some(ex => ex.id === exercise.id) 
                      ? 'primary.main' 
                      : 'divider',
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedExercises.some(ex => ex.id === exercise.id)}
                          onChange={() => handleExerciseSelection(exercise.id)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight="medium">{exercise.name}</Typography>
                          {exercise.description && (
                            <Typography variant="body2" color="text.secondary">
                              {exercise.description.substring(0, 60)}
                              {exercise.description.length > 60 ? '...' : ''}
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ width: '100%' }}
                    />
                    
                    {exercise.category && (
                      <Chip 
                        label={exercise.category}
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8,
                          fontSize: '0.7rem',
                          height: '20px' 
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            
            {filteredExercises.length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FitnessCenter sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No se encontraron ejercicios
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Refresh />} 
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("");
                    }}
                    sx={{ mt: 2 }}
                  >
                    Limpiar filtros
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
        
        {selectedExercises.length > 0 && (
          <Paper elevation={3} sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configurar Ejercicios Seleccionados
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configura los detalles para cada ejercicio seleccionado
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {selectedExercises.map((exercise, index) => (
              <Card 
                key={exercise.id} 
                variant="outlined" 
                sx={{ mb: 2, borderRadius: '12px', borderColor: 'primary.light' }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FitnessCenter color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {exercise.exerciseName}
                      </Typography>
                    </Box>
                    
                    <IconButton 
                      color="error" 
                      onClick={() => handleExerciseSelection(exercise.id)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" sx={styles.labelText}>
                        Series
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'sets', 
                            Math.max(1, (exercise.sets || 0) - 1)
                          )}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        
                        <TextField
                          type="number"
                          size="small"
                          value={exercise.sets}
                          onChange={(e) => handleExerciseDataChange(exercise.id, 'sets', e.target.value)}
                          InputProps={{ inputProps: { min: 1 } }}
                          sx={{ 
                            width: '60px',
                            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                          }}
                        />
                        
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'sets', 
                            (exercise.sets || 0) + 1
                          )}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" sx={styles.labelText}>
                        Repeticiones
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'steps', 
                            Math.max(1, (exercise.steps || 0) - 1)
                          )}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        
                        <TextField
                          type="number"
                          size="small"
                          value={exercise.steps}
                          onChange={(e) => handleExerciseDataChange(exercise.id, 'steps', e.target.value)}
                          InputProps={{ inputProps: { min: 1 } }}
                          sx={{ 
                            width: '60px',
                            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                          }}
                        />
                        
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'steps', 
                            (exercise.steps || 0) + 1
                          )}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" sx={styles.labelText}>
                        Peso (kg)
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'kg', 
                            Math.max(0, (exercise.kg || 0) - 2.5)
                          )}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        
                        <TextField
                          type="number"
                          size="small"
                          value={exercise.kg}
                          onChange={(e) => handleExerciseDataChange(exercise.id, 'kg', e.target.value)}
                          InputProps={{ inputProps: { min: 0, step: 2.5 } }}
                          sx={{ 
                            width: '60px',
                            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                          }}
                        />
                        
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'kg', 
                            (exercise.kg || 0) + 2.5
                          )}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" sx={styles.labelText}>
                        Descanso (seg)
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'rest', 
                            Math.max(0, (exercise.rest || 0) - 10)
                          )}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        
                        <TextField
                          type="number"
                          size="small"
                          value={exercise.rest}
                          onChange={(e) => handleExerciseDataChange(exercise.id, 'rest', e.target.value)}
                          InputProps={{ inputProps: { min: 0, step: 10 } }}
                          sx={{ 
                            width: '60px',
                            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                          }}
                        />
                        
                        <IconButton
                          size="small"
                          onClick={() => handleExerciseDataChange(
                            exercise.id, 
                            'rest', 
                            (exercise.rest || 0) + 10
                          )}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Paper>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => router.push('/manage-user')}
            sx={{ 
              borderRadius: '10px',
              px: 3,
              py: 1
            }}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting || selectedExercises.length === 0}
            sx={{ 
              borderRadius: '10px',
              px: 4,
              py: 1
            }}
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Asignar ${selectedExercises.length} ejercicio${selectedExercises.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </Box>
      </form>
    </Container>
  );
}