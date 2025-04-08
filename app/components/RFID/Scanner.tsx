// app/components/RFIDScanner.tsx - Focus on payment status
'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';

const RFIDScanner: React.FC = () => {
  const [rfidInput, setRfidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [eventSource, setEventSource] = useState(null);
  const inputRef = useRef(null);

  // Initialize SSE connection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const source = new EventSource('/api/rfid-events');
    
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type) {
        setScanResult(data);
        playSound(data.type);
      }
    };
    
    source.onerror = (error) => {
      console.error('SSE error:', error);
      source.close();
    };
    
    setEventSource(source);
    
    return () => {
      source.close();
    };
  }, []);

  // Focus input on load and after each scan
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanResult]);

  // Play sound function
  const playSound = (status) => {
    let soundFile;
    switch (status) {
      case 'allowed': soundFile = 'access-granted.mp3'; break;
      case 'warning': soundFile = 'warning.mp3'; break;
      case 'denied': soundFile = 'access-denied.mp3'; break;
      default: soundFile = 'access-granted.mp3';
    }
    
    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.play();
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!rfidInput.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/rfid/scan', {
        rfidCardNumber: rfidInput,
      });

      setScanResult(response.data);
      playSound(response.data.status);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al escanear tarjeta');
      playSound('denied');
    } finally {
      setLoading(false);
      setRfidInput('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Control de Membresías RFID
      </Typography>
      
      <form onSubmit={handleScanSubmit}>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            inputRef={inputRef}
            label="Escanea tarjeta RFID"
            value={rfidInput}
            onChange={(e) => setRfidInput(e.target.value)}
            fullWidth
            autoFocus
            placeholder="Escanea o ingresa el número de tarjeta RFID"
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Verificar'}
          </Button>
        </Box>
      </form>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {scanResult && (
        <Card 
          sx={{ 
            mb: 4, 
            boxShadow: 3,
            border: `2px solid ${
              scanResult.status === 'allowed' ? '#4caf50' : 
              scanResult.status === 'warning' ? '#ff9800' : '#f44336'
            }`
          }}
        >
          <Box sx={{ 
            bgcolor: scanResult.status === 'allowed' ? '#4caf50' : 
                     scanResult.status === 'warning' ? '#ff9800' : '#f44336',
            color: 'white',
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6">
              {scanResult.status === 'allowed' ? 'Membresía Activa' : 
               scanResult.status === 'warning' ? 'Verificar Pago' : 'Acceso Denegado'}
            </Typography>
            <Typography variant="body2">
              {scanResult.timestamp ? formatDate(scanResult.timestamp) + ' ' + 
                format(new Date(scanResult.timestamp), 'HH:mm:ss') : 
                format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
            </Typography>
          </Box>
          
          {scanResult.user ? (
            <Box sx={{ display: 'flex' }}>
              <CardContent sx={{ flex: '1 1 auto' }}>
                <Typography variant="h5" component="div">
                  {scanResult.user.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {scanResult.user.email}
                </Typography>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  <Chip 
                    label={`Membresía: ${scanResult.user.membershipType || 'Estándar'}`} 
                    size="small" 
                    color="primary" 
                  />
                  <Chip 
                    label={`Estado: ${scanResult.user.membershipStatus || 'N/A'}`} 
                    size="small" 
                    color={getStatusColor(scanResult.user.membershipStatus)}
                  />
                </Box>
                
                <Typography variant="body2">
                  <strong>Expiración:</strong> {formatDate(scanResult.user.membershipExpiry)}
                </Typography>
                
                {scanResult.user.lastCheckIn && (
                  <Typography variant="body2">
                    <strong>Último acceso:</strong> {formatDate(scanResult.user.lastCheckIn)} {' '}
                    {format(new Date(scanResult.user.lastCheckIn), 'HH:mm')}
                  </Typography>
                )}
                
                {scanResult.message && (
                  <Alert 
                    severity={
                      scanResult.status === 'allowed' ? 'success' : 
                      scanResult.status === 'warning' ? 'warning' : 'error'
                    }
                    sx={{ mt: 1.5 }}
                  >
                    {scanResult.message}
                  </Alert>
                )}
              </CardContent>
            </Box>
          ) : (
            <CardContent>
              <Alert severity="error">
                {scanResult.message || 'Tarjeta no reconocida'}
              </Alert>
            </CardContent>
          )}
        </Card>
      )}
    </Box>
  );
};

export default RFIDScanner;