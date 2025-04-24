'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  IconButton,
  Grid,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import axios from 'axios';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { SelectChangeEvent } from '@mui/material';

interface AccessLog {
  id: string;
  userId: string | null;
  timestamp: string;
  status: string;
  reason: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    membershipType: string | null;
    membershipStatus: string | null;
  } | null;
}

const RFIDLogs: React.FC = () => {
  // Initialize with today's date range
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(today),
    endDate: endOfDay(today)
  });
  
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  const fetchLogs = useCallback(async (resetPage: boolean = false) => {
    setLoading(true);
    try {
      const currentPage = resetPage ? 0 : page;
      if (resetPage) {
        setPage(0);
      }

      const params = new URLSearchParams();
      
      // Format dates for API
      params.append('startDate', format(dateRange.startDate, 'yyyy-MM-dd'));
      params.append('endDate', format(dateRange.endDate, 'yyyy-MM-dd'));
      
      if (status) {
        params.append('status', status);
      }
      
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());

      const response = await axios.get(`/api/members/rfid/logs?${params.toString()}`);
      
      if (response.data && response.data.logs) {
        if (resetPage) {
          setLogs(response.data.logs);
        } else {
          setLogs(prevLogs => [...prevLogs, ...response.data.logs]);
        }
        
        // Check if there might be more logs to load
        setHasMore(response.data.logs.length === pageSize);
      } else {
        if (resetPage) {
          setLogs([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching access logs:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, status, page, pageSize]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  // Apply filters when status or date range changes
  useEffect(() => {
    fetchLogs(true);
  }, [status, dateRange, fetchLogs]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  const loadMore = () => {
    setPage(prevPage => prevPage + 1);
    fetchLogs(false);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setStatus(event.target.value);
  };

  const handleSetToday = () => {
    setDateRange({
      startDate: startOfDay(today),
      endDate: endOfDay(today)
    });
  };

  const handleSet7Days = () => {
    setDateRange({
      startDate: startOfDay(subDays(today, 6)),
      endDate: endOfDay(today)
    });
  };

  const handleSet30Days = () => {
    setDateRange({
      startDate: startOfDay(subDays(today, 29)),
      endDate: endOfDay(today)
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Historial de Accesos
        </Typography>
        <IconButton 
          color="primary" 
          onClick={() => fetchLogs(true)}
          disabled={loading}
        >
          <Refresh />
        </IconButton>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Date Range Selector - Left Side */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="date"
            value={format(dateRange.startDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              setDateRange({ ...dateRange, startDate: new Date(e.target.value) });
            }}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
          <span style={{ margin: '0 8px' }}>-</span>
          <input
            type="date"
            value={format(dateRange.endDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              setDateRange({ ...dateRange, endDate: new Date(e.target.value) });
            }}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </Grid>
        
        {/* Status Selector - Middle */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={status}
              onChange={handleStatusChange}
              label="Estado"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="allowed">Permitido</MenuItem>
              <MenuItem value="denied">Denegado</MenuItem>
              <MenuItem value="warning">Advertencia</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Quick Date Buttons - Right Side */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            variant="outlined"
            onClick={handleSet30Days}
            size="small"
          >
            30 días
          </Button>
          
          <Button 
            variant="outlined"
            onClick={handleSet7Days}
            size="small"
          >
            7 días
          </Button>
          
          <Button 
            variant="outlined"
            onClick={handleSetToday}
            size="small"
          >
            Hoy
          </Button>
        </Grid>
      </Grid>

      {loading && logs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha y Hora</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Razón</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                      <TableCell>{log.user?.name || 'Tarjeta no asignada'}</TableCell>
                      <TableCell>{log.user?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            log.status === 'allowed' ? 'Permitido' : 
                            log.status === 'warning' ? 'Advertencia' : 'Denegado'
                          } 
                          color={
                            log.status === 'allowed' ? 'success' : 
                            log.status === 'warning' ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{log.reason || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay registros de acceso para mostrar
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button 
                variant="outlined" 
                onClick={loadMore}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Cargando...' : 'Cargar más'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default RFIDLogs;