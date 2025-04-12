'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Container,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import { AssignmentIndOutlined, HistoryOutlined, Refresh } from '@mui/icons-material';
import RFIDMembersList from '@/app/components/RFID/MembersList';
import RFIDLogs from '@/app/components/RFID/Logs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rfid-tabpanel-${index}`}
      aria-labelledby={`rfid-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface AccessNotification {
  type: 'allowed' | 'denied' | 'warning';
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
    accessPoints: number;
    membershipStatus: string | null;
  } | null;
  pointsDeducted?: number;
  isToleranceEntry?: boolean;
  cardNumber: string;
  deviceId?: string;
  timestamp: string;
}

export default function RFIDManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    todayAccesses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<AccessNotification | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rfid/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Error fetching stats');
        setStats({
          totalMembers: 0,
          activeMembers: 0,
          expiredMembers: 0,
          todayAccesses: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalMembers: 0,
        activeMembers: 0,
        expiredMembers: 0,
        todayAccesses: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("Iniciando conexión SSE...");
    fetchStats();
    
    let eventSource: EventSource | null = null;
    
    const setupEventSource = () => {
      console.log("Configurando EventSource...");
      if (eventSource) {
        eventSource.close();
      }
      
      eventSource = new EventSource('/api/rfid-events');
      
      eventSource.onopen = () => {
        console.log("Conexión SSE establecida correctamente");
      };
      
      eventSource.onmessage = (event) => {
        console.log("Evento SSE recibido:", event.data);
        try {
          const data = JSON.parse(event.data);
          
          if (data.type && data.cardNumber) {
            if (data.event !== 'connected') {
              setNotification(data);
              setNotificationOpen(true);
              fetchStats(); // Actualizar estadísticas cuando llega un evento
              playSound(data.type);
            }
            console.log("Notificación procesada:", data);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource?.close();
        
        setTimeout(setupEventSource, 5000);
      };
    };
    
    setupEventSource();
    
    return () => {
      console.log("Limpiando conexión SSE");
      eventSource?.close();
    };
  }, [fetchStats]);

  const playSound = (status: string) => {
    let soundFile;
    switch (status) {
      case 'allowed': soundFile = 'access-granted.mp3'; break;
      case 'warning': soundFile = 'warning.mp3'; break;
      case 'denied': soundFile = 'access-denied.mp3'; break;
      default: soundFile = 'notification.mp3';
    }

    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.play().catch(err => {
        console.error('Error playing sound:', err);
      });
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCloseNotification = () => {
    setNotificationOpen(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h4">
          Gestión de Acceso RFID
        </Typography>
      </div>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <div className="flex justify-between items-center">
                <Typography color="textSecondary" gutterBottom>
                  Total Miembros
                </Typography>
                <IconButton
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </div>
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h5">{stats.totalMembers}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <div className="flex justify-between items-center">
                <Typography color="textSecondary" gutterBottom>
                  Miembros Activos
                </Typography>
                <IconButton
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </div>
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h5">{stats.activeMembers}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff8e1' }}>
            <CardContent>
              <div className="flex justify-between items-center">
                <Typography color="textSecondary" gutterBottom>
                  Sin Accesos
                </Typography>
                <IconButton
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </div>
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h5">{stats.expiredMembers}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f3e5f5' }}>
            <CardContent>
              <div className="flex justify-between items-center">
                <Typography color="textSecondary" gutterBottom>
                  Accesos Hoy
                </Typography>
                <IconButton
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </div>
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h5">{stats.todayAccesses}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab icon={<AssignmentIndOutlined />} label="Gestionar Miembros" />
          <Tab icon={<HistoryOutlined />} label="Historial de Accesos" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <RFIDMembersList />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <RFIDLogs />
        </TabPanel>
      </Paper>

      <Snackbar
        open={notificationOpen}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={
            notification?.type === 'allowed' ? 'success' :
              notification?.type === 'warning' ? 'warning' : 'error'
          }
          variant="filled"
          sx={{ width: '100%' }}
        >
          <Typography variant="subtitle1">
            {notification?.user?.name || 'Tarjeta no registrada'}
          </Typography>
          <Typography variant="body2">
            {notification?.message}
          </Typography>
          {notification?.user && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {notification.isToleranceEntry ? 
                "Período de tolerancia - No se descontaron puntos" : 
                `Puntos restantes: ${notification.user.accessPoints}`}
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </Container>
  );
}