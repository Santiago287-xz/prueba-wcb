// app/rfid-management/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Primero intentamos obtener datos con las nuevas APIs
      const [membershipsResponse, accessResponse] = await Promise.all([
        fetch('/api/memberships/stats'),
        fetch('/api/access/stats/today')
      ]);

      // Verificamos si las respuestas fueron exitosas
      if (membershipsResponse.ok && accessResponse.ok) {
        const membershipsData = await membershipsResponse.json();
        const accessData = await accessResponse.json();

        setStats({
          totalMembers: membershipsData.total || 0,
          activeMembers: membershipsData.active || 0,
          expiredMembers: membershipsData.expired || 0,
          todayAccesses: accessData.count || 0,
        });
      } else {
        // Si alguna falla, usamos la API de respaldo
        fallbackFetchStats();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Si hay un error, usamos la API de respaldo
      fallbackFetchStats();
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackFetchStats = async () => {
    try {
      const response = await fetch('/api/rfid/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Si incluso la API de respaldo falla, usamos valores por defecto
        console.error('Error fetching fallback stats');
        setStats({
          totalMembers: 0,
          activeMembers: 0,
          expiredMembers: 0,
          todayAccesses: 0,
        });
      }
    } catch (fallbackError) {
      console.error('Error fetching fallback stats:', fallbackError);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const openTransactionModal = () => {
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
            // Implementar lógica de guardado similar a handleSaveTransaction
            fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(transaction)
            })
              .then(response => {
                if (response.ok) {
                  closeTransactionModal();
                  fetchStats(); // Refrescar estadísticas después de una transacción
                }
              })
              .catch(error => {
                console.error('Error:', error);
              });
          }}
        />
      )}
    </Container>
  );
}