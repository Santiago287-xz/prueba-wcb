"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Checkbox, 
  FormControlLabel, 
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import axios from "axios";
import toast from "react-hot-toast";

export default function AssignExercisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { userId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [formData, setFormData] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authorization
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }

    if (status === "authenticated" && session.user.role !== "trainer" && session.user.role !== "admin") {
      router.push("/unauthorized");
      return;
    }

    // Load data
    fetchData();
  }, [status, session, router, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user details
      const userResponse = await axios.get(`/api/users/${userId}`);
      setUser(userResponse.data);

      // Fetch available exercises
      const exercisesResponse = await axios.get('/api/exercise/manage-exercise');
      setAvailableExercises(exercisesResponse.data.data || []);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleExerciseSelection = (exerciseId) => {
    // Toggle exercise selection
    setSelectedExercises(prev => {
      const isSelected = prev.some(ex => ex.id === exerciseId);
      if (isSelected) {
        return prev.filter(ex => ex.id !== exerciseId);
      } else {
        const exercise = availableExercises.find(ex => ex.id === exerciseId);
        return [...prev, {
          id: exercise.id,
          exerciseName: exercise.name,
          sets: 3,
          steps: 10,
          kg: 0,
          rest: 60
        }];
      }
    });
  };

  const handleExerciseDataChange = (exerciseId, field, value) => {
    setSelectedExercises(prev => 
      prev.map(ex => 
        ex.id === exerciseId 
          ? { ...ex, [field]: parseInt(value) || 0 } 
          : ex
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedExercises.length === 0) {
      toast.error("Please select at least one exercise");
      return;
    }
    
    setSubmitting(true);
    
    try {
      await axios.post('/api/exercise/assign-exercise', {
        selectedStudents: [userId],
        workOutArray: selectedExercises,
        fromDate: formData.fromDate,
        toDate: formData.toDate
      });
      
      toast.success("Exercises assigned successfully");
      router.push('/manage-user');
    } catch (err) {
      console.error("Error assigning exercises:", err);
      toast.error("Failed to assign exercises");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          onClick={() => router.push('/manage-user')}
          sx={{ mt: 2 }}
        >
          Back to User Management
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Assign Exercises to {user?.name}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Available Exercises
          </Typography>
          
          <Grid container spacing={2}>
            {availableExercises.map(exercise => (
              <Grid item xs={12} sm={6} md={4} key={exercise.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedExercises.some(ex => ex.id === exercise.id)}
                      onChange={() => handleExerciseSelection(exercise.id)}
                    />
                  }
                  label={exercise.name}
                />
              </Grid>
            ))}
          </Grid>
          
          {selectedExercises.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                Configure Selected Exercises
              </Typography>
              
              <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Exercise</TableCell>
                      <TableCell>Sets</TableCell>
                      <TableCell>Reps</TableCell>
                      <TableCell>Weight (kg)</TableCell>
                      <TableCell>Rest (sec)</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedExercises.map(exercise => (
                      <TableRow key={exercise.id}>
                        <TableCell>{exercise.exerciseName}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={exercise.sets}
                            onChange={(e) => handleExerciseDataChange(exercise.id, 'sets', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={exercise.steps}
                            onChange={(e) => handleExerciseDataChange(exercise.id, 'steps', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={exercise.kg}
                            onChange={(e) => handleExerciseDataChange(exercise.id, 'kg', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={exercise.rest}
                            onChange={(e) => handleExerciseDataChange(exercise.id, 'rest', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            color="error" 
                            onClick={() => handleExerciseSelection(exercise.id)}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/manage-user')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting || selectedExercises.length === 0}
            >
              {submitting ? <CircularProgress size={24} /> : 'Assign Exercises'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}