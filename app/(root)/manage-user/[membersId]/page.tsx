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
import { CustomizedExercise } from "@/types";

// Categorías predefinidas de ejercicios con sus iconos
const EXERCISE_CATEGORIES = {
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

export default function AssignExercisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const membersId = typeof params.membersId === 'string' ? params.membersId : params.membersId[0];
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  // Estados principales
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState<CustomizedExercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [error, setError] = useState(null);
  
  // Estados para móvil
  const [drawerOpen, setDrawerOpen] = useState(false);
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
      const exercisesWithCategories = (exercisesResponse.data.data || []).map(exercise => {
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
          category: exercise.category || "Otros",
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
      const response = await axios.post('/api/fitness/exercise/assign-exercise', requestBody);
      
      // Mostrar snackbar de éxito
      setSuccessSnackbar(true);
      
      // Esperar un momento antes de redirigir
      setTimeout(() => {
        router.push('/manage-user');
      }, 1500);
    } catch (err) {
      console.error("Error assigning exercises:", err);
      toast.error(`Error al asignar ejercicios: ${err.response?.data?.error || 'Error desconocido'}`);
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

  // Agrupar ejercicios por categoría
  const exercisesByCategory = useMemo(() => {
    const groupedExercises = {};
    
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
  const selectedExercisesByCategory = useMemo(() => {
    const grouped = {};
    
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
        background: "linear-gradient(145deg, #2a3f54 0%, #1a2a3a 100%)",
        color: "white"
      }}>
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
          Volver
        </Button>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ 
            width: 50,
            height: 50,
            bgcolor: 'white',
            color: '#2a3f54',
            fontWeight: 'bold',
            mr: 2
          }}>
            {user ? getInitials(user.name) : ''}
          </Avatar>
          
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {user?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>

        {/* Stepper para móvil */}
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel={!isMobile}
          orientation={isMobile ? "vertical" : "horizontal"}
          sx={{ mt: 3 }}
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
                    height: isMobile ? 48 : 56
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
                py: isMobile ? 1.5 : 1
              }}
            >
              Siguiente
            </Button>
          </Box>
        </Paper>
      )}
      
      {activeStep === 1 && (
        <>
          <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px', mb: 2 }}>
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
                  width: { xs: '140px', sm: '200px' },
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
            
            <Divider sx={{ mb: 3 }} />
            
            {/* Ejercicios agrupados por categoría en acordeones */}
            <Box sx={{ mb: 3 }}>
              {categoriesWithExercises.length > 0 ? (
                categoriesWithExercises.map((category) => (
                  <Accordion 
                    key={category} 
                    defaultExpanded={false} 
                    sx={{ 
                      mb: 1, 
                      borderRadius: '12px', 
                      overflow: 'hidden',
                      '&:before': { display: 'none' } // Quitar línea superior
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
                        
                        {/* Indicador de seleccionados en esta categoría */}
                        {selectedExercisesByCategory[category] && selectedExercisesByCategory[category].length > 0 && (
                          <Chip 
                            size="small" 
                            color="primary" 
                            label={`${selectedExercisesByCategory[category].length} seleccionados`} 
                            sx={{ ml: 1, height: 24 }} 
                          />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1 }}>
                      <Grid container spacing={1}>
                        {exercisesByCategory[category].map(exercise => (
                          <Grid item xs={12} key={exercise.id}>
                            <Card 
                              variant={selectedExercises.some(ex => ex.id === exercise.id) ? "elevation" : "outlined"}
                              elevation={selectedExercises.some(ex => ex.id === exercise.id) ? 3 : 0}
                              sx={{ 
                                borderColor: selectedExercises.some(ex => ex.id === exercise.id) 
                                  ? 'primary.main' 
                                  : 'divider',
                                borderRadius: '10px'
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
            </Box>
            
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
          
          {/* FAB para mostrar seleccionados en móvil */}
          {isMobile && selectedExercises.length > 0 && (
            <Fab
              color="primary"
              variant="extended"
              onClick={() => setDrawerOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                zIndex: 1050
              }}
            >
              <Badge badgeContent={selectedExercises.length} color="error">
                <FitnessCenter sx={{ mr: 1 }} />
                Ver seleccionados
              </Badge>
            </Fab>
          )}
          
          {/* Drawer para móvil con ejercicios seleccionados */}
          <Drawer
            anchor="bottom"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                maxHeight: '70vh',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                px: 2,
                py: 2
              }
            }}
          >
            <Typography variant="h6" gutterBottom align="center">
              Ejercicios Seleccionados ({selectedExercises.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List sx={{ overflow: 'auto', maxHeight: 'calc(70vh - 100px)' }}>
              {Object.keys(selectedExercisesByCategory).map(category => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    {EXERCISE_CATEGORIES[category] || <FitnessCenter fontSize="small" />}
                    <span style={{ marginLeft: '8px' }}>{category}</span>
                  </Typography>
                  
                  {selectedExercisesByCategory[category].map(exercise => (
                    <ListItem
                      key={exercise.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleExerciseSelection(exercise.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      }
                      sx={{ py: 0.5 }}
                    >
                      <ListItemText 
                        primary={exercise.exerciseName}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setDrawerOpen(false)}
                fullWidth
                sx={{ borderRadius: '10px' }}
              >
                Cerrar
              </Button>
            </Box>
          </Drawer>
        </>
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
                      borderColor: 'primary.light'
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
                              sx={{ width: '55px' }}
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
                              sx={{ width: '55px' }}
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
                              sx={{ width: '55px' }}
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
                              sx={{ width: '55px' }}
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