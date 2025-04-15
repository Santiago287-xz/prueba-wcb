"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Typography, 
  Box, 
  Chip, 
  Grid, 
  Paper,
  LinearProgress,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Stack,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Collapse,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { 
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Flag as FlagIcon,
  School as SchoolIcon,
  MonetizationOn as MonetizationOnIcon,
  CalendarToday as CalendarTodayIcon,
  Directions as DirectionsRunIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import axios from "axios";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export function WelcomeMessage({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Bienvenido");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting("Buenos días");
      } else if (hour >= 12 && hour < 19) {
        setGreeting("Buenas tardes");
      } else {
        setGreeting("Buenas noches");
      }
    };

    updateGreeting();
    const intervalId = setInterval(updateGreeting, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Typography variant="h4" fontWeight="bold" gutterBottom>
      {greeting}, {name}
    </Typography>
  );
}

function CollapsibleWidget({ title, icon, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();
  
  return (
    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={icon}
        title={<Typography variant="h6">{title}</Typography>}
        action={
          <IconButton 
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label="mostrar detalles"
          >
            {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        }
        sx={{ 
          bgcolor: theme.palette.grey[50],
          borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none'
        }}
      />
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </CardContent>
      </Collapse>
    </Card>
  );
}

function AttendanceHistoryChart({ attendanceData }) {
  const theme = useTheme();
  
  const chartData = useMemo(() => {
    if (!attendanceData || !attendanceData.length) return [];
    
    const grouped = attendanceData.reduce((acc, log) => {
      const date = format(parseISO(log.timestamp), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = 0;
      acc[date] += 1;
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([date, count]) => ({
      date: format(parseISO(date), 'dd/MM'),
      visits: count
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  }, [attendanceData]);

  if (!chartData.length) {
    return <Typography color="text.secondary" align="center">No hay datos de asistencia disponibles</Typography>;
  }

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="visits" 
            name="Visitas" 
            fill={theme.palette.primary.main} 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

function WeeklyPatternChart({ attendanceData }) {
  const theme = useTheme();
  
  const chartData = useMemo(() => {
    if (!attendanceData || !attendanceData.length) return [];
    
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    const dayCounts = days.reduce((acc, day) => {
      acc[day] = 0;
      return acc;
    }, {});
    
    attendanceData.forEach(log => {
      const date = parseISO(log.timestamp);
      const dayName = days[date.getDay()];
      dayCounts[dayName] += 1;
    });
    
    return days.map(day => ({
      day,
      visits: dayCounts[day]
    }));
  }, [attendanceData]);

  if (!chartData.some(item => item.visits > 0)) {
    return <Typography color="text.secondary" align="center">No hay datos suficientes</Typography>;
  }

  return (
    <Box sx={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar 
            dataKey="visits" 
            name="Visitas" 
            fill={theme.palette.success.light} 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

function ExerciseProgram({ exercises }) {
  if (!exercises || exercises.length === 0) {
    return (
      <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
        No tienes ejercicios asignados actualmente
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ejercicio</TableCell>
            <TableCell>Series</TableCell>
            <TableCell>Repeticiones</TableCell>
            <TableCell>Peso</TableCell>
            <TableCell>Notas</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {exercises.map((ex) => (
            <TableRow key={ex.id} hover>
              <TableCell>{ex.name}</TableCell>
              <TableCell>{ex.sets}</TableCell>
              <TableCell>{ex.reps}</TableCell>
              <TableCell>{ex.weight ? `${ex.weight} kg` : 'N/A'}</TableCell>
              <TableCell>{ex.notes || ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function PointsUsageChart({ accessData }) {
  const theme = useTheme();
  
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];
  
  const chartData = useMemo(() => {
    if (!accessData || !accessData.length) return [];
    
    const monthlyUsage = accessData.reduce((acc, log) => {
      const month = format(parseISO(log.timestamp), 'MMM', { locale: es });
      if (!acc[month]) acc[month] = 0;
      acc[month] += log.pointsDeducted || 1;
      return acc;
    }, {});
    
    return Object.entries(monthlyUsage).map(([name, value]) => ({
      name, 
      value
    }));
  }, [accessData]);

  if (!chartData.length) {
    return <Typography color="text.secondary" align="center">No hay datos disponibles</Typography>;
  }

  return (
    <Box sx={{ width: '100%', height: 250, display: 'flex', justifyContent: 'center' }}>
      <ResponsiveContainer width="80%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} puntos`, 'Uso']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function DashboardClient({ user }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [dashboardData, setDashboardData] = useState({
    user: {
      ...user,
      pointUnitCost: 0,
      membershipType: "Estándar",
      membershipStatus: "inactive",
      accessPoints: 0,
      basePrice: 0,
      pointsTotal: 30
    },
    accessLogs: [],
    exercises: [],
    notifications: [],
    stats: {
      visitsThisMonth: 0,
      daysSinceLastVisit: null,
      totalVisits: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/members-info");
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Error al cargar los datos del panel. Por favor, intenta de nuevo más tarde.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const { 
    user: userData, 
    accessLogs, 
    exercises, 
    notifications, 
    stats 
  } = dashboardData;
  
  const lowPointsWarning = userData.accessPoints <= 5 && userData.accessPoints > 0;
  const noPointsWarning = userData.accessPoints === 0;
  
  const progressPercentage = Math.min(100, (userData.accessPoints / userData.pointsTotal) * 100);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mt: 4 }}
        action={
          <Button color="inherit" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper 
          elevation={3}
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            p: 4, 
            borderRadius: 2,
            mb: 4,
            textAlign: 'center'
          }}
        >
          <WelcomeMessage name={userData.name} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              Plan {userData.membershipType}
            </Typography>
            <Chip 
              label={userData.membershipStatus === "active" ? "Activo" : "Inactivo"} 
              color={userData.membershipStatus === "active" ? "success" : "error"} 
              size="small"
            />
          </Box>
          
          <Box sx={{ mt: 3, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2">Puntos disponibles:</Typography>
              <Typography variant="body2" fontWeight="bold">{userData.accessPoints}/{userData.pointsTotal}</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage} 
              sx={{ 
                height: 10, 
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white'
                }
              }} 
            />
            <Typography variant="caption" color="white" sx={{ fontStyle: 'italic', mt: 1, display: 'block' }}>
              Aumenta tus puntos para disfrutar de más accesos al gimnasio
            </Typography>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        {notifications.map(notification => (
          <Alert 
            key={notification.id}
            severity={notification.type}
            sx={{ mb: 2 }}
            action={
              notification.type === "warning" || notification.type === "error" ? (
                <Button color="inherit" size="small">
                  Recargar
                </Button>
              ) : null
            }
          >
            {notification.message}
          </Alert>
        ))}
      </Grid>

      <Grid item xs={12} md={6} lg={4}>
        <CollapsibleWidget 
          title="Puntos y Costos" 
          icon={<Avatar sx={{ bgcolor: 'warning.main' }}><MonetizationOnIcon /></Avatar>}
        >
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Puntos disponibles
            </Typography>
            <Typography variant="h2" color="warning.main" fontWeight="bold">
              {userData.accessPoints}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              puntos
            </Typography>
          </Box>
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Valor por punto: ${userData.pointUnitCost.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valor total: ${(userData.accessPoints * userData.pointUnitCost).toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Precio base: ${userData.basePrice.toFixed(2)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<MonetizationOnIcon />}
              size="small"
            >
              Recargar Puntos
            </Button>
          </Box>
        </CollapsibleWidget>
      </Grid>

      <Grid item xs={12} md={6} lg={4}>
        <CollapsibleWidget 
          title="Información Personal" 
          icon={<Avatar sx={{ bgcolor: 'primary.main' }}><PersonIcon /></Avatar>}
        >
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Nombre</Typography>
                <Typography variant="body1">{userData.name}</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{userData.email}</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PhoneIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Teléfono</Typography>
                <Typography variant="body1">{userData.phone || "No disponible"}</Typography>
              </Box>
            </Box>
            
            {userData.goal && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FlagIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Objetivo</Typography>
                  <Typography variant="body1">
                    {typeof userData.goal === 'string' ? 
                      userData.goal.replace(/_/g, ' ').charAt(0).toUpperCase() + userData.goal.replace(/_/g, ' ').slice(1) :
                      "No disponible"}
                  </Typography>
                </Box>
              </Box>
            )}
            
            {userData.level && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SchoolIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Nivel de Entrenamiento</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={typeof userData.level === 'string' ? 
                        userData.level.charAt(0).toUpperCase() + userData.level.slice(1) : 
                        "No disponible"} 
                      color="primary" 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </Stack>
        </CollapsibleWidget>
      </Grid>

      <Grid item xs={12} md={6} lg={4}>
        <CollapsibleWidget 
          title="Uso de Puntos" 
          icon={<Avatar sx={{ bgcolor: 'info.main' }}><TimelineIcon /></Avatar>}
        >
          {accessLogs.length > 0 ? (
            <PointsUsageChart accessData={accessLogs} />
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No hay datos disponibles
            </Typography>
          )}
        </CollapsibleWidget>
      </Grid>

      <Grid item xs={12} md={6}>
        <CollapsibleWidget 
          title="Historial de Asistencia" 
          icon={<Avatar sx={{ bgcolor: 'success.main' }}><AssignmentIcon /></Avatar>}
        >
          <AttendanceHistoryChart attendanceData={accessLogs} />
        </CollapsibleWidget>
      </Grid>

      <Grid item xs={12} md={6}>
        <CollapsibleWidget 
          title="Patrón Semanal" 
          icon={<Avatar sx={{ bgcolor: 'success.dark' }}><CalendarTodayIcon /></Avatar>}
        >
          <WeeklyPatternChart attendanceData={accessLogs} />
        </CollapsibleWidget>
      </Grid>

      <Grid item xs={12}>
        <CollapsibleWidget 
          title="Mi Programa de Ejercicios" 
          icon={<Avatar sx={{ bgcolor: 'secondary.main' }}><DirectionsRunIcon /></Avatar>}
        >
          <ExerciseProgram exercises={exercises} />
        </CollapsibleWidget>
      </Grid>

      <Grid item xs={12}>
        <CollapsibleWidget 
          title="Resumen de Actividad" 
          icon={<Avatar sx={{ bgcolor: 'error.light' }}><NotificationsIcon /></Avatar>}
          defaultExpanded={false}
        >
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 3, 
                borderRadius: 2, 
                bgcolor: 'primary.light',
                color: 'white'
              }}>
                <Typography variant="h6">
                  {stats.visitsThisMonth}
                </Typography>
                <Typography variant="body2">
                  Visitas este mes
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 3, 
                borderRadius: 2, 
                bgcolor: 'success.light',
                color: 'white'
              }}>
                <Typography variant="h6">
                  {stats.totalVisits}
                </Typography>
                <Typography variant="body2">
                  Visitas totales
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 3, 
                borderRadius: 2, 
                bgcolor: stats.daysSinceLastVisit > 7 ? 'error.light' : 'warning.light',
                color: 'white'
              }}>
                <Typography variant="h6">
                  {stats.daysSinceLastVisit !== null ? stats.daysSinceLastVisit : "N/A"}
                </Typography>
                <Typography variant="body2">
                  Días desde última visita
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CollapsibleWidget>
      </Grid>
    </Grid>
  );
}