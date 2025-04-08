// app/components/RFIDLogs.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  TextField,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/lab';
import { format } from 'date-fns';
import axios from 'axios';

interface AccessLog {
  id: string;
  userId: string;
  timestamp: string;
  status: string;
  reason: string | null;
  processedBy: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    membershipType: string;
    membershipStatus: string;
  };
}

const RFIDLogs: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | null>(new Date());
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    fetchLogs();
  }, [date, status]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) {
        params.append('date', date.toISOString().split('T')[0]);
      }
      if (status) {
        params.append('status', status);
      }

      const response = await axios.get(`/api/rfid/logs?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching access logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss');
  };

  const clearFilters = () => {
    setDate(new Date());
    setStatus('');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Historial de Accesos
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <DatePicker
            label="Fecha"
            value={date}
            onChange={setDate}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              label="Estado"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="allowed">Permitido</MenuItem>
              <MenuItem value="denied">Denegado</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
          <Button variant="outlined" onClick={clearFilters} sx={{ mr: 1 }}>
            Limpiar
          </Button>
          <Button variant="contained" onClick={fetchLogs}>
            Filtrar
          </Button>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
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
                    <TableCell>{log.user?.name || 'Usuario no registrado'}</TableCell>
                    <TableCell>{log.user?.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={log.status === 'allowed' ? 'Permitido' : 'Denegado'} 
                        color={log.status === 'allowed' ? 'success' : 'error'}
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
      )}
    </Box>
  );
};

export default RFIDLogs;