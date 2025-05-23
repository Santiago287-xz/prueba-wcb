"use client";

import { useState, useEffect, useMemo } from "react";
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
  IconButton,
  Card,
  CardContent,
  Avatar,
  Chip,
  Tooltip,
  InputAdornment,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
  Fab,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  Snackbar
} from "@mui/material";
import {
  Delete,
  Search,
  FitnessCenter,
  ArrowBackIos,
  Add,
  Remove,
  ExpandMore,
  KeyboardArrowUp,
  Accessibility,
  DirectionsRun,
  SportsGymnastics,
  Speed,
  CheckCircle,
  SaveAlt
} from "@mui/icons-material";
import axios from "axios";
import toast from "react-hot-toast";

// Definir interfaces para el tipad
interface User {
  id: string;
  name: string;
  email: string;
  gender?: string;
  age?: number;
  role?: string;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface CategoryToIcon {
  [key: string]: JSX.Element;
}

export interface CustomizedExercise {
  id: string;
  exerciseName: string;
  category: string;
  sets: number;
  reps?: number;
  steps?: number;
  kg: number;
  rest: number;
  weight?: number;
}

// Categorías predefinidas de ejercicios con sus iconos
const EXERCISE_CATEGORIES: CategoryToIcon = {
  "Piernas": <DirectionsRun />,
  "Brazos": <Accessibility />,
  "Pecho": <SportsGymnastics />,
  "Espalda": <SportsGymnastics />,
  "Cardio": <Speed />,
  "Core": <FitnessCenter />,
  "Otros": <FitnessCenter />
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

interface ExercisesGroupedByCategory {
  [key: string]: Exercise[];
}

interface SelectedExercisesByCategory {
  [key: string]: CustomizedExercise[];
}

export default function AssignExercisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const membersId = typeof params.membersId === 'string' ? params.membersId : (Array.isArray(params.membersId) ? params.membersId[0] : '');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Estados principales
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<CustomizedExercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [successSnackbar, setSuccessSnackbar] = useState(false);

  // Pasos del proceso
  const steps = ['Seleccionar periodo', 'Elegir ejercicios', 'Configurar ejercicios'];

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

    // Detectar scroll para mostrar botón "volver arriba"
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [status, session, router, membersId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener detalles del usuario
      const userResponse = await axios.get(`/api/members?memberId=${membersId}`);
      setUser(userResponse.data);

      // Obtener la lista de ejercicios disponibles
      const exercisesResponse = await axios.get('/api/fitness/exercise/manage-exercise');

      // Asignar categorías a los ejercicios si no tienen
      const exercisesWithCategories = (exercisesResponse.data.data || []).map((exercise: Exercise) => {
        // Si no tiene categoría, asignar "Otros"
        if (!exercise.category) {
          // Inferir categoría basado en el nombre
          let inferredCategory = "Otros";
          const nameLower = exercise.name.toLowerCase();

          if (nameLower.includes("pecho") || nameLower.includes("press") || nameLower.includes("bench")) {
            inferredCategory = "Pecho";
          } else if (nameLower.includes("pierna") || nameLower.includes("sentadilla") || nameLower.includes("squat") ||
            nameLower.includes("cuadriceps") || nameLower.includes("femoral") || nameLower.includes("gemelo") ||
            nameLower.includes("calf")) {
            inferredCategory = "Piernas";
          } else if (nameLower.includes("bicep") || nameLower.includes("tricep") || nameLower.includes("curl") ||
            nameLower.includes("brazo")) {
            inferredCategory = "Brazos";
          } else if (nameLower.includes("espalda") || nameLower.includes("pull") || nameLower.includes("remo") ||
            nameLower.includes("dominada") || nameLower.includes("row")) {
            inferredCategory = "Espalda";
          } else if (nameLower.includes("abdom") || nameLower.includes("core") || nameLower.includes("plank") ||
            nameLower.includes("crunch")) {
            inferredCategory = "Core";
          } else if (nameLower.includes("cardio") || nameLower.includes("correr") || nameLower.includes("running") ||
            nameLower.includes("eliptica") || nameLower.includes("bicicleta") || nameLower.includes("bike")) {
            inferredCategory = "Cardio";
          }

          return { ...exercise, category: inferredCategory };
        }
        return exercise;
      });

      setAvailableExercises(exercisesWithCategories);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExerciseSelection = (exerciseId: string) => {
    setSelectedExercises(prev => {
      const isSelected = prev.some(ex => ex.id === exerciseId);
      if (isSelected) {
        return prev.filter(ex => ex.id !== exerciseId);
      } else {
        const exercise = availableExercises.find(ex => ex.id === exerciseId);
        if (exercise) {
          return [...prev, {
            id: exercise.id,
            exerciseName: exercise.name,
            category: exercise.category || "Otros",
            sets: 3,
            reps: 10,
            kg: 0,
            rest: 60
          }];
        }
        return prev;
      }
    });
  };

  const handleExerciseDataChange = (exerciseId: string, field: string, value: number | string) => {
    setSelectedExercises(prev =>
      prev.map(ex =>
        ex.id === exerciseId ? { ...ex, [field]: parseInt(value as string) || 0 } : ex
      )
    );
  };

  const handleSubmit = async () => {
    if (selectedExercises.length === 0) {
      toast.error("Por favor, selecciona al menos un ejercicio");
      return;
    }

    const requestBody = {
      selectedStudents: [membersId],
      workOutArray: selectedExercises,
      fromDate: formData.fromDate,
      toDate: formData.toDate
    };

    setSubmitting(true);

    try {
      await axios.post('/api/fitness/exercise/assign-exercise', requestBody);

      // Mostrar snackbar de éxito
      setSuccessSnackbar(true);

      // Esperar un momento antes de redirigir
      setTimeout(() => {
        router.push('/manage-user');
      }, 1500);
    } catch (err) {
      console.error("Error assigning exercises:", err);
      const errorMessage = (err as any)?.response?.data?.error || 'Error desconocido';
      toast.error(`Error al asignar ejercicios: ${errorMessage}`);
      setSubmitting(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    window.scrollTo(0, 0);
  };

  // Filtrar ejercicios por término de búsqueda
  const filteredExercises = useMemo(() =>
    availableExercises.filter(ex =>
      searchTerm === "" || ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [availableExercises, searchTerm]
  );

  // Agrupar ejercicios por categoría
  const exercisesByCategory = useMemo<ExercisesGroupedByCategory>(() => {
    const groupedExercises: ExercisesGroupedByCategory = {};

    // Inicializar todas las categorías primero
    Object.keys(EXERCISE_CATEGORIES).forEach(category => {
      groupedExercises[category] = [];
    });

    // Agrupar ejercicios por categoría
    availableExercises.forEach(exercise => {
      const category = exercise.category || "Otros";
      if (!groupedExercises[category]) {
        groupedExercises[category] = [];
      }

      // Solo agregar si coincide con la búsqueda
      if (searchTerm === "" || exercise.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        groupedExercises[category].push(exercise);
      }
    });

    return groupedExercises;
  }, [availableExercises, searchTerm]);

  // Obtener categorías con ejercicios
  const categoriesWithExercises = useMemo(() => {
    return Object.keys(exercisesByCategory).filter(
      category => exercisesByCategory[category].length > 0
    );
  }, [exercisesByCategory]);

  // Organizar ejercicios seleccionados por categoría para la vista previa
  const selectedExercisesByCategory = useMemo<SelectedExercisesByCategory>(() => {
    const grouped: SelectedExercisesByCategory = {};

    selectedExercises.forEach(exercise => {
      const category = exercise.category || "Otros";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(exercise);
    });

    return grouped;
  }, [selectedExercises]);

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
      <Container sx={{ py: { xs: 2, md: 4 } }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={() => router.push('/manage-user')} sx={{ mt: 2 }}>
          Volver a Gestión de Usuarios
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header con información del usuario */}
      <Paper elevation={3} sx={{ 
        p: { xs: 2, md: 3 }, 
        borderRadius: '16px', 
        mb: 2,
        background: "linear-gradient(145deg, #f5f7fa 0%, #e4e8f0 100%)", // Cambiado a fondo claro
        color: "#1a2a3a" // Cambiado a texto oscuro
      }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIos />} 
          onClick={() => router.push('/manage-user')}
          sx={{ 
            color: '#2a3f54', // Cambiado para fondo claro
            borderColor: 'rgba(42, 63, 84, 0.5)', 
            mb: 2,
            '&:hover': { 
              borderColor: '#2a3f54', 
              backgroundColor: 'rgba(42, 63, 84, 0.1)' 
            } 
          }}
        >
          Volver
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{
            width: 50,
            height: 50,
            bgcolor: '#2a3f54',
            color: 'white',
            fontWeight: 'bold',
            mr: 2
          }}>
            {user ? getInitials(user.name) : ''}
          </Avatar>

          <Box>
            <Typography variant="h6" fontWeight="bold">
              {user?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#2a3f54' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>

        {/* Stepper para móvil */}
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel={!isMobile}
          orientation={isMobile ? "vertical" : "horizontal"}
          sx={{ 
            mt: 3,
            '& .MuiStepLabel-label': { 
              color: 'rgba(0, 0, 0, 0.6)', // Cambiado a gris oscuro
            },
            '& .MuiStepLabel-label.Mui-active': { 
              color: '#1a2a3a', // Cambiado a azul oscuro
              fontWeight: 'bold',
            },
            '& .MuiStepLabel-label.Mui-completed': { 
              color: '#1a2a3a', // Etapas completadas en azul oscuro
            },
            '& .MuiStepIcon-root': {
              color: 'rgba(0, 0, 0, 0.4)', // Iconos inactivos en gris
            },
            '& .MuiStepIcon-root.Mui-active': {
              color: '#2a3f54', // Icono activo en azul
            },
            '& .MuiStepIcon-root.Mui-completed': {
              color: '#2a3f54', // Iconos completados en azul
            },
            '& .MuiStepIcon-text': {
              fill: 'white', // Número dentro del icono en blanco
            },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Contenido según el paso actual */}
      {activeStep === 0 && (
        <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Periodo de asignación
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                Fecha de inicio
              </Typography>
              <TextField
                fullWidth
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleChange}
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    height: isMobile ? 48 : 56,
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                Fecha de fin
              </Typography>
              <TextField
                fullWidth
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleChange}
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    height: isMobile ? 48 : 56
                  }
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleNext}
              size={isMobile ? "large" : "medium"}
              sx={{
                borderRadius: '10px',
                px: 4,
                py: isMobile ? 1.5 : 1,
              }}
            >
              Siguiente
            </Button>
          </Box>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px', mb: 2 }}>
          {isMobile ? (
            <>
              {/* Barra de búsqueda arriba en mobile */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  placeholder="Buscar ejercicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              {/* Título debajo de la búsqueda */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Seleccionar Ejercicios
                </Typography>
              </Box>
            </>
          ) : (
            // Estructura original para desktop
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Seleccionar Ejercicios
              </Typography>
              <TextField
                placeholder="Buscar ejercicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{
                  width: { xs: '100%', sm: '250px' },
                  '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
          <Divider sx={{ mb: 3 }} />
          {searchTerm !== "" ? (
            // Mostrar lista plana al buscar
            <Box sx={{ mb: 3 }}>
              {filteredExercises.length > 0 ? (
                filteredExercises.map((exercise, index) => (
                  <Box
                    key={exercise.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1,
                      px: 2,
                      borderBottom: index < filteredExercises.length - 1 ? '1px solid #ddd' : 'none'
                    }}
                  >
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
                          <Typography fontWeight={selectedExercises.some(ex => ex.id === exercise.id) ? "bold" : "regular"}>
                            {exercise.name}
                          </Typography>
                          {exercise.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {exercise.description.substring(0, 60)}
                              {exercise.description.length > 60 ? '...' : ''}
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Box>
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FitnessCenter sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No se encontraron ejercicios con esa búsqueda
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSearchTerm("")}
                    sx={{ mt: 2 }}
                  >
                    Limpiar búsqueda
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            // Mostrar accordions agrupados al no buscar
            <>
              {categoriesWithExercises.length > 0 ? (
                categoriesWithExercises.map((category) => (
                  <Accordion
                    key={category}
                    defaultExpanded={false}
                    sx={{
                      mb: 1,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      '&:before': { display: 'none' }
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {EXERCISE_CATEGORIES[category] || <FitnessCenter />}
                        <Typography sx={{ ml: 1, fontWeight: 'medium' }}>
                          {category} ({exercisesByCategory[category].length})
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1 }}>
                      <Grid container spacing={1}>
                        {exercisesByCategory[category].map((exercise: Exercise) => (
                          <Grid item xs={12} key={exercise.id}>
                            <Card
                              variant={selectedExercises.some(ex => ex.id === exercise.id) ? "elevation" : "outlined"}
                              elevation={selectedExercises.some(ex => ex.id === exercise.id) ? 3 : 0}
                              sx={{
                                borderColor: selectedExercises.some(ex => ex.id === exercise.id) ? 'primary.main' : 'divider',
                                borderRadius: '10px',
                                backgroundColor: selectedExercises.some(ex => ex.id === exercise.id) ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
                              }}
                            >
                              <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
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
                                      <Typography fontWeight={selectedExercises.some(ex => ex.id === exercise.id) ? "bold" : "regular"}>
                                        {exercise.name}
                                      </Typography>
                                      {exercise.description && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                          {exercise.description.substring(0, 60)}
                                          {exercise.description.length > 60 ? '...' : ''}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                  sx={{ width: '100%', m: 0 }}
                                />
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FitnessCenter sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No se encontraron ejercicios con esa búsqueda
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSearchTerm("")}
                    sx={{ mt: 2 }}
                  >
                    Limpiar búsqueda
                  </Button>
                </Box>
              )}
            </>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{ borderRadius: '10px' }}
            >
              Atrás
            </Button>

            <Button
              variant="contained"
              onClick={handleNext}
              disabled={selectedExercises.length === 0}
              sx={{ borderRadius: '10px' }}
            >
              Siguiente ({selectedExercises.length})
            </Button>
          </Box>
        </Paper>
      )}

      {activeStep === 2 && (
        <>
          <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Configurar Ejercicios
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Ajusta los detalles para cada ejercicio seleccionado
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {Object.keys(selectedExercisesByCategory).length > 0 ? (
              <>
                {Object.keys(selectedExercisesByCategory).map(category => (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {EXERCISE_CATEGORIES[category] || <FitnessCenter />}
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ ml: 1 }}>
                        {category}
                      </Typography>
                    </Box>

                    {selectedExercisesByCategory[category].map((exercise, index) => (
                      <Card
                        key={exercise.id}
                        variant="outlined"
                        sx={{
                          mb: 2,
                          borderRadius: '10px',
                          borderColor: 'primary.light',
                          bgcolor: 'rgba(25, 118, 210, 0.04)'
                        }}
                      >
                        <CardContent sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography fontWeight="bold">
                              {exercise.exerciseName}
                            </Typography>

                            <IconButton
                              color="error"
                              onClick={() => handleExerciseSelection(exercise.id)}
                              size="small"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>

                          <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 0.5 }}>
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
                                  sx={{ width: '70px' }}
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
                              <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 0.5 }}>
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
                                  sx={{ width: '70px' }}
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
                              <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 0.5 }}>
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
                                  sx={{ width: '70px' }}
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
                              <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ mb: 0.5 }}>
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
                                  sx={{ width: '70px' }}
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
                  </Box>
                ))}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FitnessCenter sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  No hay ejercicios seleccionados
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBack}
                  sx={{ mt: 2 }}
                >
                  Volver al paso anterior
                </Button>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{ borderRadius: '10px' }}
              >
                Atrás
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={submitting || selectedExercises.length === 0}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveAlt />}
                sx={{
                  borderRadius: '10px',
                  px: { xs: 3, sm: 4 },
                  py: { xs: 1.5, sm: 1 }
                }}
              >
                {submitting ? 'Guardando...' : 'Guardar Ejercicios'}
              </Button>
            </Box>
          </Paper>
        </>
      )}

      {/* Botón flotante para volver arriba */}
      {showScrollTop && (
        <Fab
          size="small"
          color="primary"
          aria-label="scroll back to top"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: { xs: 86, sm: 20 },
            right: 16,
            zIndex: 10,
          }}
        >
          <KeyboardArrowUp />
        </Fab>
      )}

      {/* Snackbar de éxito */}
      <Snackbar
        open={successSnackbar}
        autoHideDuration={2000}
        onClose={() => setSuccessSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity="success"
          icon={<CheckCircle />}
          sx={{ width: '100%' }}
        >
          ¡Ejercicios asignados correctamente!
        </Alert>
      </Snackbar>
    </Container>
  );
}