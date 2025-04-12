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
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { ScannerOutlined, AssignmentIndOutlined, HistoryOutlined, Refresh } from '@mui/icons-material';
import RFIDScanner from '@/app/components/RFID/Scanner';
import RFIDMembersList from '@/app/components/RFID/MembersList';
import RFIDLogs from '@/app/components/RFID/Logs';
import TransactionModal from '@/app/components/Transactions/TransactionModal';

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
    membershipType: string | null;
    membershipExpiry: string | null;
    membershipStatus: string | null;
  } | null;
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
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
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
              fetchStats();
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

  const openTransactionModal = () => {
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
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

        <button
          onClick={openTransactionModal}
          className="px-4 py-2 bg-purple-600 text-white rounded flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V12a2 2 0 002 2h8a2 2 0 002-2v-.5a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
            <path d="M3 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM3 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM7 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 017 10.75zM7 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM11 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" />
          </svg>
          Nueva Transacción
        </button>
      </div>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <div className="flex justify-between items-center">
                <Typography color="textSecondary" gutterBottom>
                  Total Miembros
                </Typography>
                <Button
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </Button>
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
                <Button
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </Button>
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
                  Membresías Expiradas
                </Typography>
                <Button
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </Button>
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
                <Button
                  sx={{ minWidth: '24px', p: 0 }}
                  onClick={fetchStats}
                >
                  <Refresh fontSize="small" />
                </Button>
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
          <Tab icon={<ScannerOutlined />} label="Escanear Tarjetas" />
          <Tab icon={<AssignmentIndOutlined />} label="Gestionar Miembros" />
          <Tab icon={<HistoryOutlined />} label="Historial de Accesos" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <RFIDScanner />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <RFIDMembersList />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <RFIDLogs />
        </TabPanel>
      </Paper>

      {isTransactionModalOpen && (
        <TransactionModal
          transaction={null}
          onClose={closeTransactionModal}
          onSave={(transaction) => {
            fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(transaction)
            })
              .then(response => {
                if (response.ok) {
                  closeTransactionModal();
                  fetchStats();
                }
              })
              .catch(error => {
                console.error('Error:', error);
              });
          }}
        />
      )}

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
        </Alert>
      </Snackbar>
    </Container>
  );
}