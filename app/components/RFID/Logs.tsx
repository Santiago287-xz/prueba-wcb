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
  Grid,
  TextField,
  IconButton,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';

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
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  const fetchLogs = useCallback(async (reset: boolean = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 0 : page;
      if (reset) {
        setPage(0);
      }

      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', formatDateToYYYYMMDD(startDate));
      }
      if (endDate) {
        params.append('endDate', formatDateToYYYYMMDD(endDate));
      }
      if (status) {
        params.append('status', status);
      }
      
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());

      const response = await axios.get(`/api/rfid/logs?${params.toString()}`);
      
      if (response.data && Array.isArray(response.data.logs)) {
        if (reset) {
          setLogs(response.data.logs);
        } else {
          setLogs(prevLogs => [...prevLogs, ...response.data.logs]);
        }
        setHasMore(response.data.logs.length === pageSize);
      } else {
        setLogs(reset ? [] : logs);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching access logs:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, page, logs, pageSize]);

  useEffect(() => {
    fetchLogs(true);
  }, []);

  const formatDateToYYYYMMDD = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

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
    fetchLogs();
  };

  const resetFilters = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setStatus('');
    fetchLogs(true);
  };

  const handleStartDateChange = (newDate: Date | null) => {
    setStartDate(newDate);
  };

  const handleEndDateChange = (newDate: Date | null) => {
    setEndDate(newDate);
  };

  const handleStatusChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setStatus(event.target.value as string);
  };

  const handleApplyFilters = () => {
    fetchLogs(true);
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
        <Grid item xs={12} md={3}>
          <div style={{ width: '100%' }}>
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              dateFormat="dd/MM/yyyy"
              customInput={
                <TextField
                  fullWidth
                  label="Fecha inicial"
                  variant="outlined"
                  size="small"
                />
              }
            />
          </div>
        </Grid>
        <Grid item xs={12} md={3}>
          <div style={{ width: '100%' }}>
            <DatePicker
              selected={endDate}
              onChange={handleEndDateChange}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              dateFormat="dd/MM/yyyy"
              customInput={
                <TextField
                  fullWidth
                  label="Fecha final"
                  variant="outlined"
                  size="small"
                />
              }
            />
          </div>
        </Grid>
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button 
            variant="contained" 
            onClick={handleApplyFilters}
            disabled={loading}
            fullWidth
          >
            Aplicar filtros
          </Button>
          <Button 
            variant="outlined" 
            onClick={resetFilters}
            disabled={loading}
            fullWidth
          >
            Mostrar todos
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
                    <TableRow key={log.id}>
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