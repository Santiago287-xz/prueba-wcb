// app/components/RFID/Notifications.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Snackbar,
  Alert,
  Chip,
  Card,
  CardContent,
  Divider,
  Grid
} from '@mui/material';
import { format } from 'date-fns';

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
  deviceId: string;
  timestamp: string;
}

const RFIDNotifications: React.FC = () => {
  const [notification, setNotification] = useState<AccessNotification | null>(null);
  const [notifications, setNotifications] = useState<AccessNotification[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const source = new EventSource('/api/rfid-events');
    
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type && data.cardNumber) {
          // Add to notifications list (most recent first)
          setNotifications(prev => [data, ...prev].slice(0, 50));
          
          // Set as current notification
          setNotification(data);
          setSnackbarOpen(true);
          
          // Play sound
          playSound(data.type);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };
    
    source.onerror = (error) => {
      console.error('SSE error:', error);
      source.close();
      
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        const newSource = new EventSource('/api/rfid-events');
        setEventSource(newSource);
      }, 5000);
    };
    
    setEventSource(source);
    
    return () => {
      source.close();
    };
  }, []);

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
      audio.play();
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'allowed': return 'success';
      case 'warning': return 'warning';
      case 'denied': return 'error';
      default: return 'default';
    }
  };

  const getDeviceLabel = (deviceId: string) => {
    switch (deviceId) {
      case 'entrance': return 'Entrada Principal';
      case 'exit': return 'Salida';
      default: return deviceId;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Centro de Notificaciones RFID
      </Typography>
      
      <Typography variant="subtitle1" gutterBottom>
        Accesos Recientes
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        {notifications.length === 0 ? (
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No hay accesos registrados aún
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
            {notifications.map((notif, index) => (
              <Card key={index} sx={{ mb: 2, borderLeft: `4px solid ${
                notif.type === 'allowed' ? '#4caf50' : 
                notif.type === 'warning' ? '#ff9800' : '#f44336'
              }` }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" fontWeight="medium">
                        {notif.user?.name || 'Tarjeta no registrada'}
                      </Typography>
                      
                      {notif.user && (
                        <Typography variant="body2" color="text.secondary">
                          {notif.user.email}
                        </Typography>
                      )}
                    </Grid>
                    
                    <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Chip 
                        label={getDeviceLabel(notif.deviceId)}
                        size="small"
                        color="info"
                        sx={{ mb: 1 }}
                      />
                      
                      <Typography variant="caption" display="block">
                        {formatDate(notif.timestamp)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Chip 
                        label={
                          notif.type === 'allowed' ? 'Acceso Permitido' : 
                          notif.type === 'warning' ? 'Verificar Membresía' : 'Acceso Denegado'
                        }
                        color={getStatusColor(notif.type) as any}
                        size="small"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        {notif.user?.membershipType && (
                          <>Membresía: {notif.user.membershipType}</>
                        )}
                        {notif.user?.membershipExpiry && (
                          <> - Expira: {format(new Date(notif.user.membershipExpiry), 'dd/MM/yyyy')}</>
                        )}
                      </Typography>
                    </Grid>
                    
                    {notif.message && (
                      <Grid item xs={12}>
                        <Alert 
                          severity={
                            notif.type === 'allowed' ? 'success' : 
                            notif.type === 'warning' ? 'warning' : 'error'
                          }
                          sx={{ mt: 1 }}
                        >
                          {notif.message}
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
      
      {/* Notification popup */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', right: 'center' }}
      >
        {notification && (
          <Alert
            onClose={handleCloseSnackbar}
            severity={
              notification.type === 'allowed' ? 'success' : 
              notification.type === 'warning' ? 'warning' : 'error'
            }
            variant="filled"
            sx={{ width: '100%' }}
            action={
              <Chip 
                label={getDeviceLabel(notification.deviceId)}
                size="small"
                color="default"
              />
            }
          >
            <Typography variant="subtitle1">
              {notification.user?.name || 'Tarjeta no registrada'}
            </Typography>
            <Typography variant="body2">
              {notification.message}
            </Typography>
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default RFIDNotifications;