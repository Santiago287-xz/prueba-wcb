'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
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
  InputAdornment,
  Stack,
  IconButton,
  Snackbar,
  Alert,
  TableSortLabel,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Refresh,
  Search,
  Edit,
  CreditCard,
  Delete
} from '@mui/icons-material';

import { Member, Trainer, MembershipPrice, NotificationState } from '@/app/types/membership';
import CreateMemberModal from './CreateMemberModal';
import EditMemberModal from './EditMemberModal';
import RenewMembershipModal from './RenewMembershipModal';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import PinModal from './PinModal';
import ResetPasswordModal from './ResetPasswordModal';

export default function MembersList() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [membershipPrices, setMembershipPrices] = useState<MembershipPrice[]>([]);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderBy, setOrderBy] = useState('lastCheckIn');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [confirmRenewalOpen, setConfirmRenewalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [notification, setNotification] = useState<NotificationState>({ open: false, message: '', severity: 'success' });

  // Estado para el PIN y su modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [generatedPin, setGeneratedPin] = useState('');
  const [createdUserName, setCreatedUserName] = useState('');
  
  // Estado para el modal de restablecer contraseña
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [newGeneratedPassword, setNewGeneratedPassword] = useState('');
  const [passwordUserName, setPasswordUserName] = useState('');

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  }, []);

  // Load members and membership prices
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/members');
      setMembers(response.data.members || []);
    } catch (error) {
      showNotification('Error al cargar miembros', 'error');
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const fetchTrainers = useCallback(async () => {
    try {
      const response = await axios.get('/api/rfid/trainers');
      setTrainers(response.data);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  }, []);

  const fetchMembershipPrices = useCallback(async () => {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const response = await axios.get('/api/membership-prices');
      if (response.data && response.data.types) {
        setMembershipPrices(response.data.types);
      } else {
        setPricesError('La respuesta de la API no tiene el formato esperado');
      }
    } catch (error) {
      console.error('Error fetching membership prices:', error);
      setPricesError('Error al cargar los precios de membresía');
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchMembers();
    fetchMembershipPrices();
    fetchTrainers();
  }, [fetchMembers, fetchMembershipPrices, fetchTrainers]);

  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  // Handle password reset
  const handleResetPassword = async (member: Member) => {
    try {
      const response = await axios.post('/api/rfid/reset-password', {
        userId: member.id
      });
      
      if (response.data && response.data.success) {
        setPasswordUserName(member.name || '');
        setNewGeneratedPassword(response.data.newPassword);
        setEditModalOpen(false); // Cierra el modal de edición
        setResetPasswordModalOpen(true); // Abre el modal de contraseña
      }
    } catch (error: any) {
      console.error('Error al restablecer contraseña:', error);
      showNotification(error.response?.data?.error || 'Error al restablecer contraseña', 'error');
    }
  };

  // Handle member deletion
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    try {
      await axios.delete(`/api/rfid/${memberToDelete.id}`);
      showNotification('Miembro eliminado correctamente', 'success');
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
      fetchMembers();
    } catch (error: any) {
      console.error('Error deleting member:', error);
      showNotification(error.response?.data?.error || 'Error al eliminar miembro', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to open delete confirmation modal
  const openDeleteConfirmation = (member: Member) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };

  // Modal handling
  const openEditModal = useCallback((member: Member) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  }, []);

  const openRenewModal = useCallback((member: Member) => {
    setSelectedMember(member);
    setRenewModalOpen(true);
  }, []);

  const openCreateModal = useCallback(() => {
    if (membershipPrices.length === 0) {
      showNotification('No hay tipos de membresía disponibles', 'error');
      return;
    }
    setCreateModalOpen(true);
  }, [membershipPrices, showNotification]);

  // Table sorting
  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Determine membership status based on points
  const getMembershipStatus = useCallback((member: Member): { status: string; color: string } => {
    if (!member.accessPoints && member.accessPoints !== 0) {
      return { status: 'Indefinido', color: 'default' };
    }

    if (member.accessPoints <= 0) {
      return { status: 'Sin puntos', color: 'error' };
    }

    if (member.accessPoints <= 5) {
      return { status: 'Pocos puntos', color: 'warning' };
    }

    return { status: 'Activo', color: 'success' };
  }, []);

  // Filter and sort members
  const filteredMembers = React.useMemo(() => {
    return [...members]
      .sort((a, b) => {
        let aValue: any, bValue: any;

        if (orderBy === 'lastCheckIn') {
          aValue = a.lastCheckIn ? new Date(a.lastCheckIn).getTime() : 0;
          bValue = b.lastCheckIn ? new Date(b.lastCheckIn).getTime() : 0;
        } else if (orderBy === 'accessPoints') {
          aValue = a.accessPoints || 0;
          bValue = b.accessPoints || 0;
        } else if (orderBy === 'name') {
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          aValue = (a as any)[orderBy];
          bValue = (b as any)[orderBy];
        }

        return order === 'asc' ? aValue - bValue : bValue - aValue;
      })
      .filter(member => {
        // Filter by status
        if (statusFilter !== 'all') {
          const memberStatus = getMembershipStatus(member).status.toLowerCase();
          if (statusFilter === 'active' && memberStatus !== 'activo') return false;
          if (statusFilter === 'nopoints' && memberStatus !== 'sin puntos') return false;
          if (statusFilter === 'lowpoints' && memberStatus !== 'pocos puntos') return false;
        }

        // Filter by search term
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            member.name?.toLowerCase().includes(searchLower) ||
            member.email?.toLowerCase().includes(searchLower) ||
            (member.rfidCardNumber && member.rfidCardNumber.includes(search))
          );
        }

        return true;
      });
  }, [members, orderBy, order, statusFilter, search, getMembershipStatus]);

  // Truncate RFID card number for display
  const truncateRFID = (rfid?: string) => {
    if (!rfid) return '';
    if (rfid.length <= 10) return rfid;
    return `${rfid.substring(0, 4)}...${rfid.substring(rfid.length - 4)}`;
  };

  // Get trainer name from ID
  const getTrainerName = (trainerId?: string) => {
    if (!trainerId) return 'No asignado';
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? trainer.name : 'No asignado';
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">Membresías RFID</Typography>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchMembers}
        >
          Actualizar
        </Button>
      </Box>

      {/* Price loading/error alerts */}
      {pricesLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Cargando precios de membresía...
        </Alert>
      )}

      {pricesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pricesError}
        </Alert>
      )}

      {/* Filters and Actions */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexGrow: 1 }}>
          <TextField
            placeholder="Buscar miembro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Estado"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="lowpoints">Pocos puntos</MenuItem>
              <MenuItem value="nopoints">Sin puntos</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={openCreateModal}
          disabled={membershipPrices.length === 0 || pricesLoading}
        >
          Nuevo Miembro
        </Button>
      </Box>

      {/* Members Table */}
      <TableContainer component={Paper} sx={{ mb: 4, boxShadow: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Nombre
                  </TableSortLabel>
                </TableCell>
                <TableCell>Tarjeta RFID</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'accessPoints'}
                    direction={orderBy === 'accessPoints' ? order : 'asc'}
                    onClick={() => handleSort('accessPoints')}
                  >
                    Puntos disponibles
                  </TableSortLabel>
                </TableCell>
                <TableCell>Entrenador</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'lastCheckIn'}
                    direction={orderBy === 'lastCheckIn' ? order : 'asc'}
                    onClick={() => handleSort('lastCheckIn')}
                  >
                    Último Acceso
                  </TableSortLabel>
                </TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const memberStatus = getMembershipStatus(member);

                  return (
                    <TableRow key={member.id} hover>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {truncateRFID(member.rfidCardNumber)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {membershipPrices.find(p => p.id === member.membershipType)?.name || member.membershipType || 'Estándar'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={memberStatus.status}
                          color={memberStatus.color as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={
                            !member.accessPoints ? 'error' :
                              member.accessPoints <= 5 ? 'warning.main' :
                                'text.secondary'
                          }
                          fontWeight={member.accessPoints <= 5 ? 'medium' : 'regular'}
                        >
                          {member.accessPoints || 0} puntos
                        </Typography>
                      </TableCell>
                      <TableCell>{getTrainerName(member.trainer)}</TableCell>
                      <TableCell>
                        {member.lastCheckIn
                          ? new Date(member.lastCheckIn).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditModal(member)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openRenewModal(member)}
                          >
                            <CreditCard fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openDeleteConfirmation(member)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No se encontraron miembros con los filtros aplicados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Create Member Modal */}
      <CreateMemberModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        membershipPrices={membershipPrices}
        trainers={trainers}
        onSuccess={(name, pin) => {
          setCreateModalOpen(false);
          setGeneratedPin(pin);
          setCreatedUserName(name);
          setPinModalOpen(true);
          fetchMembers();
        }}
        isCreatingMember={isCreatingMember}
        setIsCreatingMember={setIsCreatingMember}
        showNotification={showNotification}
      />

      {/* Edit Member Modal */}
      <EditMemberModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        member={selectedMember}
        membershipPrices={membershipPrices}
        trainers={trainers}
        onSuccess={() => {
          setEditModalOpen(false);
          fetchMembers();
          showNotification('Miembro actualizado correctamente', 'success');
        }}
        showNotification={showNotification}
        onResetPassword={handleResetPassword}
      />

      {/* Renew Membership Modal */}
      <RenewMembershipModal
        open={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        member={selectedMember}
        membershipPrices={membershipPrices}
        confirmOpen={confirmRenewalOpen}
        setConfirmOpen={setConfirmRenewalOpen}
        onSuccess={() => {
          setRenewModalOpen(false);
          setConfirmRenewalOpen(false);
          fetchMembers();
          showNotification('Puntos de acceso recargados correctamente', 'success');
        }}
        showNotification={showNotification}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        member={memberToDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteMember}
      />

      {/* PIN Modal */}
      <PinModal
        open={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          showNotification('Miembro creado correctamente', 'success');
        }}
        pin={generatedPin}
        userName={createdUserName}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false);
          showNotification('Contraseña restablecida correctamente', 'success');
        }}
        newPassword={newGeneratedPassword}
        userName={passwordUserName}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}