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
  CardContent,
  SelectChangeEvent
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

// Extender la interfaz de Member para incluir accessPoints
interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string | number;
  gender: 'male' | 'female' | 'other';
  age?: number;
  rfidCardNumber?: string;
  membershipType?: string;
  membershipStatus?: string;
  accessPoints: number;
  lastCheckIn?: string | Date;
  height?: number;
  weight?: number;
  goal?: string;
  level?: string;
}

interface MembershipPrice {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
}

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
    accessPoints: 0,
    paymentMethod: 'cash',
    height: '',
    weight: '',
    goal: 'lose_weight',
    level: 'beginner'
  });

  // Renewal state
  const [renewalState, setRenewalState] = useState({
    membershipTypeId: '',
    pointsAmount: 10,
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

  // Calculate total amount for renewal
  useEffect(() => {
    if (renewalState.membershipTypeId && renewalState.pointsAmount > 0) {
      const selectedType = membershipPrices.find(p => p.id === renewalState.membershipTypeId);
      if (selectedType) {
        // Calcular precio basado en puntos
        const pointCost = selectedType.basePrice / 30; // Asumiendo que un mes son 30 accesos
        setRenewalState(prev => ({
          ...prev,
          totalAmount: Math.round(pointCost * prev.pointsAmount * 100) / 100
        }));
      }
    }
  }, [renewalState.membershipTypeId, renewalState.pointsAmount, membershipPrices]);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Handle select input changes
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle gender select changes specifically
  const handleGenderChange = (e: SelectChangeEvent<"male" | "female" | "other">) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle renewal form changes
  const handleRenewalTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!name) return;

    setRenewalState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle renewal select changes
  const handleRenewalSelectChange = (e: SelectChangeEvent<string | number>) => {
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

      // Calculate initial access points (por ejemplo, 30 puntos por mes contratado)
      const accessPoints = 30;

      // First register the payment transaction
      await axios.post('/api/transactions', {
        type: 'income',
        category: 'membership',
        amount: selectedType.basePrice,
        description: `Nueva membresía ${selectedType.name} con ${accessPoints} puntos para ${formState.name}`,
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
        accessPoints: accessPoints,
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
        accessPoints: selectedMember.accessPoints,
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

      // Registrar la transacción de recarga de puntos
      await axios.post('/api/transactions', {
        type: 'income',
        category: 'membership',
        amount: renewalState.totalAmount,
        description: `Recarga de ${renewalState.pointsAmount} puntos de acceso para ${selectedMember.name}`,
        paymentMethod: renewalState.paymentMethod,
        userId: selectedMember.id,
      });

      // Actualizar los puntos del usuario
      await axios.post('/api/rfid/assign', {
        userId: selectedMember.id,
        rfidCardNumber: selectedMember.rfidCardNumber,
        membershipType: renewalState.membershipTypeId,
        membershipStatus: 'active',
        accessPoints: selectedMember.accessPoints + renewalState.pointsAmount,
      });

      showNotification('Puntos de acceso recargados correctamente', 'success');
      setRenewModalOpen(false);
      setConfirmRenewalOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error renewing membership:', error);
      showNotification(error.response?.data?.error || 'Error al recargar puntos', 'error');
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
      accessPoints: member.accessPoints || 0,
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
      pointsAmount: 10,
      paymentMethod: 'cash',
      totalAmount: selectedPrice ? Math.round((selectedPrice.basePrice / 30) * 10 * 100) / 100 : 0
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
      accessPoints: 30,
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
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
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
                  onChange={handleGenderChange}
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
                    onChange={handleSelectChange}
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
                    onChange={handleSelectChange}
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
                    onChange={handleSelectChange}
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
                <TextField
                  label="Puntos iniciales"
                  name="accessPoints"
                  type="number"
                  value={formState.accessPoints}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Método de Pago</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formState.paymentMethod}
                    onChange={handleSelectChange}
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
                      ${getMembershipPrice(formState.membershipTypeId)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">
                      Puntos iniciales:
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      {formState.accessPoints} puntos
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
                      label="Puntos disponibles"
                      value={selectedMember.accessPoints || 0}
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
                      onChange={handleGenderChange}
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
                      onChange={handleSelectChange}
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
                      onChange={handleSelectChange}
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
          Recargar Puntos de Acceso
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
                  Puntos actuales: {selectedMember.accessPoints || 0}
                </Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Membresía</InputLabel>
                    <Select
                      name="membershipTypeId"
                      value={renewalState.membershipTypeId}
                      onChange={handleRenewalSelectChange}
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
                    <InputLabel>Cantidad de puntos</InputLabel>
                    <Select
                      name="pointsAmount"
                      value={renewalState.pointsAmount}
                      onChange={handleRenewalSelectChange}
                      label="Cantidad de puntos"
                    >
                      <MenuItem value={5}>5 puntos</MenuItem>
                      <MenuItem value={10}>10 puntos</MenuItem>
                      <MenuItem value={20}>20 puntos</MenuItem>
                      <MenuItem value={30}>30 puntos</MenuItem>
                      <MenuItem value={50}>50 puntos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Método de Pago</InputLabel>
                    <Select
                      name="paymentMethod"
                      value={renewalState.paymentMethod}
                      onChange={handleRenewalSelectChange}
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
                      <Typography variant="subtitle2">Puntos totales:</Typography>
                      <Typography variant="h6" color="primary.main">
                        {(selectedMember.accessPoints || 0) + renewalState.pointsAmount} puntos
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
            Recargar
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
          Confirmar Recarga de Puntos
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            ¿Confirmar la recarga de puntos?
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
                    Puntos a recargar:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {renewalState.pointsAmount} puntos
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