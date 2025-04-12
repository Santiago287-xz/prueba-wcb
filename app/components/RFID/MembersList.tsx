'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, addMonths, isAfter, isBefore } from 'date-fns';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  InputAdornment,
  Stack,
  IconButton,
  Snackbar,
  TableSortLabel,
  CircularProgress,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Add,
  Refresh,
  Search,
  Edit,
  CreditCard,
  Close,
  Warning
} from '@mui/icons-material';
import { Member, MembershipPrice } from '@/app/types/membership';

export default function MembersList() {
  // Main state
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [membershipPrices, setMembershipPrices] = useState<MembershipPrice[]>([]);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderBy, setOrderBy] = useState('lastCheckIn');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [confirmRenewalOpen, setConfirmRenewalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Form state
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'male' as 'male' | 'female' | 'other',
    age: '',
    rfidCardNumber: '',
    membershipTypeId: '',
    membershipStatus: 'active',
    membershipMonths: 1,
    membershipExpiry: '',
    paymentMethod: 'cash',
    height: '',
    weight: '',
    goal: 'lose_weight',
    level: 'beginner'
  });

  // Renewal state
  const [renewalState, setRenewalState] = useState({
    membershipTypeId: '',
    months: 1,
    paymentMethod: 'cash',
    totalAmount: 0
  });

  // Form errors
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    rfidCardNumber: false,
    phone: false,
    age: false,
    height: false,
    weight: false
  });

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
  }, []);

  const fetchMembershipPrices = useCallback(async () => {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const response = await axios.get('/api/membership-prices');
      console.log(response.data.types)
      if (response.data && response.data.types) {
        setMembershipPrices(response.data.types);

        if (response.data.types.length > 0) {
          setFormState(prev => ({
            ...prev,
            membershipTypeId: response.data.types[0].id
          }));
          setRenewalState(prev => ({
            ...prev,
            membershipTypeId: response.data.types[0].id,
            totalAmount: response.data.types[0].basePrice
          }));
        }
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
  }, [fetchMembers, fetchMembershipPrices]);

  // Update membership expiry when months change
  useEffect(() => {
    const newExpiryDate = addMonths(new Date(), formState.membershipMonths);
    setFormState(prev => ({
      ...prev,
      membershipExpiry: format(newExpiryDate, 'yyyy-MM-dd')
    }));
  }, [formState.membershipMonths]);

  // Calculate total amount for renewal
  useEffect(() => {
    if (renewalState.membershipTypeId && renewalState.months > 0) {
      const selectedType = membershipPrices.find(p => p.id === renewalState.membershipTypeId);
      if (selectedType) {
        setRenewalState(prev => ({
          ...prev,
          totalAmount: selectedType.basePrice * prev.months
        }));
      }
    }
  }, [renewalState.membershipTypeId, renewalState.months, membershipPrices]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormState(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field if any
    if (name in errors) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  // Handle renewal form changes
  const handleRenewalChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (!name) return;

    setRenewalState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Notifications
  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  }, []);

  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {
      name: !formState.name,
      email: !formState.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email),
      rfidCardNumber: !formState.rfidCardNumber,
      phone: formState.phone ? !/^[0-9+\- ]+$/.test(formState.phone.toString()) : false,
      age: formState.age ? parseInt(formState.age.toString()) <= 0 : false,
      height: formState.height ? parseInt(formState.height.toString()) <= 0 : false,
      weight: formState.weight ? parseInt(formState.weight.toString()) <= 0 : false
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  }, [formState]);

  // CRUD operations
  const handleCreateMember = async () => {
    if (!validateForm()) return;

    try {
      // Get selected membership type
      const selectedType = membershipPrices.find(p => p.id === formState.membershipTypeId);
      if (!selectedType) {
        showNotification('Tipo de membresía no válido', 'error');
        return;
      }

      // Calculate expiry date
      const expiryDate = addMonths(new Date(), formState.membershipMonths);

      // First register the payment transaction
      await axios.post('/api/transactions', {
        type: 'income',
        category: 'membership',
        amount: selectedType.basePrice * formState.membershipMonths,
        description: `Nueva membresía ${selectedType.name} por ${formState.membershipMonths} mes(es) para ${formState.name}`,
        paymentMethod: formState.paymentMethod,
      });

      // Then create the member with RFID card
      await axios.post('/api/rfid/create-member', {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        gender: formState.gender,
        age: formState.age ? parseInt(formState.age.toString()) : undefined,
        rfidCardNumber: formState.rfidCardNumber,
        membershipType: formState.membershipTypeId,
        membershipStatus: 'active',
        membershipExpiry: format(expiryDate, 'yyyy-MM-dd'),
        height: formState.height ? parseInt(formState.height.toString()) : undefined,
        weight: formState.weight ? parseInt(formState.weight.toString()) : undefined,
        goal: formState.goal,
        level: formState.level
      });

      showNotification('Miembro creado correctamente', 'success');
      setCreateModalOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error creating member:', error);
      showNotification(error.response?.data?.error || 'Error al crear miembro', 'error');
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;

    // Validate required fields
    if (!formState.rfidCardNumber) {
      setErrors(prev => ({
        ...prev,
        rfidCardNumber: true
      }));
      return;
    }

    try {
      await axios.post('/api/rfid/assign', {
        userId: selectedMember.id,
        rfidCardNumber: formState.rfidCardNumber,
        membershipType: selectedMember.membershipType,
        membershipStatus: selectedMember.membershipStatus,
        membershipExpiry: selectedMember.membershipExpiry,
        phone: formState.phone,
        gender: formState.gender,
        age: formState.age ? parseInt(formState.age.toString()) : undefined,
        height: formState.height ? parseInt(formState.height.toString()) : undefined,
        weight: formState.weight ? parseInt(formState.weight.toString()) : undefined,
        goal: formState.goal,
        level: formState.level
      });

      showNotification('Miembro actualizado correctamente', 'success');
      setEditModalOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error updating member:', error);
      showNotification(error.response?.data?.error || 'Error al actualizar miembro', 'error');
    }
  };

  const handleRenewMembership = async () => {
    if (!selectedMember) return;

    try {
      const selectedType = membershipPrices.find(p => p.id === renewalState.membershipTypeId);
      if (!selectedType) {
        showNotification('Tipo de membresía no válido', 'error');
        return;
      }

      const now = new Date();
      let newExpiryDate;
      const currentExpiry = selectedMember.membershipExpiry ? new Date(selectedMember.membershipExpiry) : now;

      if (isAfter(currentExpiry, now)) {
        newExpiryDate = addMonths(currentExpiry, renewalState.months);
      } else {
        newExpiryDate = addMonths(now, renewalState.months);
      }

      await axios.post('/api/transactions', {
        type: 'income',
        category: 'membership',
        amount: renewalState.totalAmount,
        description: `Renovación de membresía ${selectedType.name} por ${renewalState.months} mes(es) para ${selectedMember.name}`,
        paymentMethod: renewalState.paymentMethod,
        userId: selectedMember.id,
      });

      await axios.post('/api/rfid/assign', {
        userId: selectedMember.id,
        rfidCardNumber: selectedMember.rfidCardNumber,
        membershipType: renewalState.membershipTypeId,
        membershipStatus: 'active',
        membershipExpiry: format(newExpiryDate, 'yyyy-MM-dd'),
      });

      showNotification('Membresía renovada correctamente', 'success');
      setRenewModalOpen(false);
      setConfirmRenewalOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error renewing membership:', error);
      showNotification(error.response?.data?.error || 'Error al renovar membresía', 'error');
    }
  };

  // Modal handling
  const openEditModal = useCallback((member: Member) => {
    setSelectedMember(member);
    setFormState({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone?.toString() || '',
      gender: member.gender || 'male',
      age: member.age?.toString() || '',
      rfidCardNumber: member.rfidCardNumber || '',
      membershipTypeId: member.membershipType || membershipPrices[0]?.id || '',
      membershipStatus: member.membershipStatus || 'active',
      membershipMonths: 1,
      membershipExpiry: member.membershipExpiry ? format(new Date(member.membershipExpiry), 'yyyy-MM-dd') : '',
      paymentMethod: 'cash',
      height: member.height?.toString() || '',
      weight: member.weight?.toString() || '',
      goal: member.goal || 'lose_weight',
      level: member.level || 'beginner'
    });
    setEditModalOpen(true);
  }, [membershipPrices]);

  const openRenewModal = useCallback((member: Member) => {
    setSelectedMember(member);
    const memberType = member.membershipType || membershipPrices[0]?.id || '';
    const selectedPrice = membershipPrices.find(p => p.id === memberType);

    setRenewalState({
      membershipTypeId: memberType,
      months: 1,
      paymentMethod: 'cash',
      totalAmount: selectedPrice?.basePrice || 0
    });

    setRenewModalOpen(true);
  }, [membershipPrices]);

  const openCreateModal = useCallback(() => {
    if (membershipPrices.length === 0) {
      showNotification('No hay tipos de membresía disponibles', 'error');
      return;
    }

    setFormState({
      name: '',
      email: '',
      phone: '',
      gender: 'male',
      age: '',
      rfidCardNumber: '',
      membershipTypeId: membershipPrices[0]?.id || '',
      membershipStatus: 'active',
      membershipMonths: 1,
      membershipExpiry: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      paymentMethod: 'cash',
      height: '',
      weight: '',
      goal: 'lose_weight',
      level: 'beginner'
    });

    setErrors({
      name: false,
      email: false,
      rfidCardNumber: false,
      phone: false,
      age: false,
      height: false,
      weight: false
    });

    setCreateModalOpen(true);
  }, [membershipPrices, showNotification]);

  // Table sorting
  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = useCallback((expiryDate?: string | Date): number | null => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Determine membership status based on expiry date
  const getMembershipStatus = useCallback((member: Member): { status: string; color: string } => {
    if (!member.membershipExpiry) {
      return { status: 'Indefinido', color: 'default' };
    }

    const daysLeft = getDaysUntilExpiry(member.membershipExpiry);

    if (daysLeft === null) {
      return { status: 'Desconocido', color: 'default' };
    }

    if (daysLeft < 0) {
      return { status: 'Expirado', color: 'error' };
    }

    if (daysLeft <= 7) {
      return { status: 'Por vencer', color: 'warning' };
    }

    return { status: 'Activo', color: 'success' };
  }, [getDaysUntilExpiry]);

  // Filter and sort members
  const filteredMembers = React.useMemo(() => {
    return [...members]
      .sort((a, b) => {
        let aValue: any, bValue: any;

        if (orderBy === 'lastCheckIn') {
          aValue = a.lastCheckIn ? new Date(a.lastCheckIn).getTime() : 0;
          bValue = b.lastCheckIn ? new Date(b.lastCheckIn).getTime() : 0;
        } else if (orderBy === 'membershipExpiry') {
          aValue = a.membershipExpiry ? new Date(a.membershipExpiry).getTime() : 0;
          bValue = b.membershipExpiry ? new Date(b.membershipExpiry).getTime() : 0;
        } else if (orderBy === 'daysLeft') {
          aValue = getDaysUntilExpiry(a.membershipExpiry) || -999;
          bValue = getDaysUntilExpiry(b.membershipExpiry) || -999;
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
          if (statusFilter === 'expired' && memberStatus !== 'expirado') return false;
          if (statusFilter === 'pending' && memberStatus !== 'por vencer') return false;
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
  }, [members, orderBy, order, statusFilter, search, getDaysUntilExpiry, getMembershipStatus]);

  // Get price from membership type ID
  const getMembershipPrice = useCallback((typeId: string): number => {
    const type = membershipPrices.find(p => p.id === typeId);
    return type?.basePrice || 0;
  }, [membershipPrices]);

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
              <MenuItem value="pending">Por vencer</MenuItem>
              <MenuItem value="expired">Expirados</MenuItem>
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
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'accessPoints'}
                    direction={orderBy === 'accessPoints' ? order : 'asc'}
                    onClick={() => handleSort('accessPoints')}
                  >
                    Puntos Restantes
                  </TableSortLabel>
                </TableCell>
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
                  const daysLeft = getDaysUntilExpiry(member.membershipExpiry);
                  const memberStatus = getMembershipStatus(member);

                  return (
                    <TableRow key={member.id} hover>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {member.rfidCardNumber}
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
                        {member.membershipExpiry
                          ? format(new Date(member.membershipExpiry), 'dd/MM/yyyy')
                          : 'No definida'}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={
                            !member.accessPoints ? 'error' :
                              member.accessPoints <= 5 ? 'warning.main' :
                                'text.secondary'
                          }
                          fontWeight={member.accessPoints && member.accessPoints <= 5 ? 'medium' : 'regular'}
                        >
                          {member.accessPoints || 0} puntos
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {member.lastCheckIn
                          ? format(new Date(member.lastCheckIn), 'dd/MM/yyyy HH:mm')
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

      {/* Create Member Dialog */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Crear Nuevo Miembro
          <IconButton
            aria-label="close"
            onClick={() => setCreateModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* Personal Information Section */}
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Datos Personales
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre *"
                name="name"
                value={formState.name}
                onChange={handleInputChange}
                fullWidth
                error={errors.name}
                helperText={errors.name ? "El nombre es requerido" : ""}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email *"
                name="email"
                type="email"
                value={formState.email}
                onChange={handleInputChange}
                fullWidth
                error={errors.email}
                helperText={errors.email ? "Email inválido" : ""}
                margin="normal"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Teléfono"
                name="phone"
                value={formState.phone}
                onChange={handleInputChange}
                fullWidth
                error={errors.phone}
                helperText={errors.phone ? "Formato inválido" : ""}
                margin="normal"
                size="small"
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Género</InputLabel>
                <Select
                  name="gender"
                  value={formState.gender}
                  onChange={handleInputChange}
                  label="Género"
                >
                  <MenuItem value="male">Masculino</MenuItem>
                  <MenuItem value="female">Femenino</MenuItem>
                  <MenuItem value="other">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Edad"
                name="age"
                type="number"
                value={formState.age}
                onChange={handleInputChange}
                fullWidth
                error={errors.age}
                helperText={errors.age ? "Valor inválido" : ""}
                margin="normal"
                size="small"
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>

          {/* Physical Data Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Datos Físicos
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Altura (cm)"
                  name="height"
                  type="number"
                  value={formState.height}
                  onChange={handleInputChange}
                  fullWidth
                  error={errors.height}
                  helperText={errors.height ? "Valor inválido" : ""}
                  margin="normal"
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Peso (kg)"
                  name="weight"
                  type="number"
                  value={formState.weight}
                  onChange={handleInputChange}
                  fullWidth
                  error={errors.weight}
                  helperText={errors.weight ? "Valor inválido" : ""}
                  margin="normal"
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Nivel</InputLabel>
                  <Select
                    name="level"
                    value={formState.level}
                    onChange={handleInputChange}
                    label="Nivel"
                  >
                    <MenuItem value="beginner">Principiante</MenuItem>
                    <MenuItem value="intermediate">Intermedio</MenuItem>
                    <MenuItem value="advanced">Avanzado</MenuItem>
                    <MenuItem value="expert">Experto</MenuItem>
                    <MenuItem value="professional">Profesional</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Objetivo</InputLabel>
                  <Select
                    name="goal"
                    value={formState.goal}
                    onChange={handleInputChange}
                    label="Objetivo"
                  >
                    <MenuItem value="lose_weight">Perder Peso</MenuItem>
                    <MenuItem value="gain_weight">Ganar Peso</MenuItem>
                    <MenuItem value="get_fitter">Mejorar Estado Físico</MenuItem>
                    <MenuItem value="get_stronger">Aumentar Fuerza</MenuItem>
                    <MenuItem value="get_healthier">Mejorar Salud</MenuItem>
                    <MenuItem value="get_more_flexible">Mejorar Flexibilidad</MenuItem>
                    <MenuItem value="get_more_muscular">Aumentar Masa Muscular</MenuItem>
                    <MenuItem value="learn_the_basics">Aprender Fundamentos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Membership Data Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Datos de Membresía
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Número de Tarjeta RFID *"
                  name="rfidCardNumber"
                  value={formState.rfidCardNumber}
                  onChange={handleInputChange}
                  fullWidth
                  error={errors.rfidCardNumber}
                  helperText={errors.rfidCardNumber ? "Número de tarjeta requerido" : ""}
                  margin="normal"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Tipo de Membresía</InputLabel>
                  <Select
                    name="membershipTypeId"
                    value={formState.membershipTypeId}
                    onChange={handleInputChange}
                    label="Tipo de Membresía"
                    disabled={pricesLoading || membershipPrices.length === 0}
                  >
                    {membershipPrices.map(price => (
                      <MenuItem key={price.id} value={price.id}>
                        {price.name} (${price.basePrice})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Duración</InputLabel>
                  <Select
                    name="membershipMonths"
                    value={formState.membershipMonths}
                    onChange={handleInputChange}
                    label="Duración"
                  >
                    <MenuItem value={1}>1 mes</MenuItem>
                    <MenuItem value={3}>3 meses</MenuItem>
                    <MenuItem value={6}>6 meses</MenuItem>
                    <MenuItem value={12}>12 meses</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Método de Pago</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formState.paymentMethod}
                    onChange={handleInputChange}
                    label="Método de Pago"
                  >
                    <MenuItem value="cash">Efectivo</MenuItem>
                    <MenuItem value="card">Tarjeta</MenuItem>
                    <MenuItem value="transfer">Transferencia</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Payment Summary */}
            <Card variant="outlined" sx={{ mt: 2, bgcolor: 'primary.50' }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">
                      Total a pagar:
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      ${getMembershipPrice(formState.membershipTypeId) * formState.membershipMonths}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">
                      Expira el:
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      {formState.membershipExpiry ?
                        format(new Date(formState.membershipExpiry), 'dd/MM/yyyy') :
                        format(addMonths(new Date(), formState.membershipMonths), 'dd/MM/yyyy')}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateMember}
          >
            Crear Miembro
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Editar Miembro
          <IconButton
            aria-label="close"
            onClick={() => setEditModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedMember && (
            <>
              {/* Basic Information (Read-only) */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Información Básica
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nombre"
                      value={selectedMember.name}
                      disabled
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email"
                      value={selectedMember.email}
                      disabled
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Membership Information (Read-only) */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Datos de Membresía
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Tipo de Membresía"
                      value={membershipPrices.find(p => p.id === selectedMember.membershipType)?.name || selectedMember.membershipType || 'No definido'}
                      disabled
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Estado"
                      value={getMembershipStatus(selectedMember).status}
                      disabled
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Fecha de Expiración"
                      value={selectedMember.membershipExpiry ? format(new Date(selectedMember.membershipExpiry), 'dd/MM/yyyy') : 'No definida'}
                      disabled
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Editable Information */}
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Datos Actualizables
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Teléfono"
                    name="phone"
                    value={formState.phone}
                    onChange={handleInputChange}
                    fullWidth
                    error={errors.phone}
                    helperText={errors.phone ? "Formato inválido" : ""}
                    margin="normal"
                    size="small"
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*'
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth margin="normal" size="small">
                    <InputLabel>Género</InputLabel>
                    <Select
                      name="gender"
                      value={formState.gender}
                      onChange={handleInputChange}
                      label="Género"
                    >
                      <MenuItem value="male">Masculino</MenuItem>
                      <MenuItem value="female">Femenino</MenuItem>
                      <MenuItem value="other">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Edad"
                    name="age"
                    type="number"
                    value={formState.age}
                    onChange={handleInputChange}
                    fullWidth
                    error={errors.age}
                    helperText={errors.age ? "Valor inválido" : ""}
                    margin="normal"
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Altura (cm)"
                    name="height"
                    type="number"
                    value={formState.height}
                    onChange={handleInputChange}
                    fullWidth
                    error={errors.height}
                    helperText={errors.height ? "Valor inválido" : ""}
                    margin="normal"
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Peso (kg)"
                    name="weight"
                    type="number"
                    value={formState.weight}
                    onChange={handleInputChange}
                    fullWidth
                    error={errors.weight}
                    helperText={errors.weight ? "Valor inválido" : ""}
                    margin="normal"
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Número de Tarjeta RFID *"
                    name="rfidCardNumber"
                    value={formState.rfidCardNumber}
                    onChange={handleInputChange}
                    fullWidth
                    error={errors.rfidCardNumber}
                    helperText={errors.rfidCardNumber ? "Número de tarjeta requerido" : ""}
                    margin="normal"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal" size="small">
                    <InputLabel>Objetivo</InputLabel>
                    <Select
                      name="goal"
                      value={formState.goal}
                      onChange={handleInputChange}
                      label="Objetivo"
                    >
                      <MenuItem value="lose_weight">Perder Peso</MenuItem>
                      <MenuItem value="gain_weight">Ganar Peso</MenuItem>
                      <MenuItem value="get_fitter">Mejorar Estado Físico</MenuItem>
                      <MenuItem value="get_stronger">Aumentar Fuerza</MenuItem>
                      <MenuItem value="get_healthier">Mejorar Salud</MenuItem>
                      <MenuItem value="get_more_flexible">Mejorar Flexibilidad</MenuItem>
                      <MenuItem value="get_more_muscular">Aumentar Masa Muscular</MenuItem>
                      <MenuItem value="learn_the_basics">Aprender Fundamentos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal" size="small">
                    <InputLabel>Nivel</InputLabel>
                    <Select
                      name="level"
                      value={formState.level}
                      onChange={handleInputChange}
                      label="Nivel"
                    >
                      <MenuItem value="beginner">Principiante</MenuItem>
                      <MenuItem value="intermediate">Intermedio</MenuItem>
                      <MenuItem value="advanced">Avanzado</MenuItem>
                      <MenuItem value="expert">Experto</MenuItem>
                      <MenuItem value="professional">Profesional</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleEditMember}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renew Membership Dialog */}
      <Dialog
        open={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Renovar Membresía
          <IconButton
            aria-label="close"
            onClick={() => setRenewModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedMember && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {selectedMember.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tarjeta: <span style={{ fontFamily: 'monospace' }}>{selectedMember.rfidCardNumber}</span>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiración actual: {selectedMember.membershipExpiry
                    ? format(new Date(selectedMember.membershipExpiry), 'dd/MM/yyyy')
                    : 'No definida'}
                </Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Membresía</InputLabel>
                    <Select
                      name="membershipTypeId"
                      value={renewalState.membershipTypeId}
                      onChange={handleRenewalChange}
                      label="Tipo de Membresía"
                      disabled={pricesLoading || membershipPrices.length === 0}
                    >
                      {membershipPrices.map(price => (
                        <MenuItem key={price.id} value={price.id}>
                          {price.name} (${price.basePrice})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Duración</InputLabel>
                    <Select
                      name="months"
                      value={renewalState.months}
                      onChange={handleRenewalChange}
                      label="Duración"
                    >
                      <MenuItem value={1}>1 mes</MenuItem>
                      <MenuItem value={3}>3 meses</MenuItem>
                      <MenuItem value={6}>6 meses</MenuItem>
                      <MenuItem value={12}>12 meses</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Método de Pago</InputLabel>
                    <Select
                      name="paymentMethod"
                      value={renewalState.paymentMethod}
                      onChange={handleRenewalChange}
                      label="Método de Pago"
                    >
                      <MenuItem value="cash">Efectivo</MenuItem>
                      <MenuItem value="card">Tarjeta</MenuItem>
                      <MenuItem value="transfer">Transferencia</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Card
                variant="outlined"
                sx={{ mt: 3, bgcolor: 'primary.50' }}
              >
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Total a pagar:</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        ${renewalState.totalAmount}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Nueva expiración:</Typography>
                      <Typography variant="h6" color="primary.main">
                        {(() => {
                          const now = new Date();
                          const currentExpiry = selectedMember.membershipExpiry ? new Date(selectedMember.membershipExpiry) : now;
                          let newExpiryDate;

                          if (isAfter(currentExpiry, now)) {
                            newExpiryDate = addMonths(currentExpiry, renewalState.months);
                          } else {
                            newExpiryDate = addMonths(now, renewalState.months);
                          }

                          return format(newExpiryDate, 'dd/MM/yyyy');
                        })()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewModalOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => setConfirmRenewalOpen(true)}
            disabled={pricesLoading || membershipPrices.length === 0}
          >
            Renovar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Renewal Dialog */}
      <Dialog
        open={confirmRenewalOpen}
        onClose={() => setConfirmRenewalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Confirmar Renovación
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            ¿Confirmar la renovación de esta membresía?
          </Alert>

          {selectedMember && (
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {selectedMember.name}
              </Typography>
              <Divider sx={{ my: 1 }} />

              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {membershipPrices.find(p => p.id === renewalState.membershipTypeId)?.name || renewalState.membershipTypeId}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Duración:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {renewalState.months} mes(es)
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="medium">
                    ${renewalState.totalAmount}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Método de pago:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {renewalState.paymentMethod === 'cash' ? 'Efectivo' :
                      renewalState.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRenewalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRenewMembership}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity as any}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}