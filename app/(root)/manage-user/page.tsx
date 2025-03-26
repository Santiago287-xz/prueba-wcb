"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  TablePagination, Select, Button
} from "@mui/material";
import axios from "axios";
import { User } from "@prisma/client";
import useSWR from "swr";
import useTrainersStore from "@/app/hooks/useTrainersStore";
import MenuItem from "@mui/material/MenuItem";
import toast from "react-hot-toast";

// Custom data fetching function using SWR and Axios
const fetcher = async (...args: Parameters<typeof axios>) => {
  const res = await axios(...args);
  return res.data;
};


const ManageUser: React.FC = () => {

  const { loading, trainers, fetchTrainers } = useTrainersStore();

  // State and data fetching using useSWR
  const [currentPage, setCurrentPage] = useState<number>(1); // Current page number (initialize to 1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10); // Number of rows per page
  const [orderBy, setOrderBy] = useState<keyof User>("name"); // Field to sort by (default is "name")
  const [order, setOrder] = useState<"asc" | "desc">("asc"); // Sorting order (default is "asc")
  const { data, isLoading, mutate } = useSWR(
      `/api/users?page=${currentPage}&limit=${rowsPerPage}`, // Include the limit in the API endpoint for fetching user data with pagination
      fetcher, // The custom fetcher function using Axios

  );

  useEffect(() => {
    fetchTrainers()
  }, [fetchTrainers]);


  const handleChangeTrainer = async (trainerId:string, userId: string) => {
      try {
        const data = {
          trainerId,
          userId,
        }
        const res = await axios.patch("/api/users", data, {
          headers: {
            "Content-Type": "application/json"
          }
        })


        if(res.status === 201) {
          toast.success(res.data.message)
          await mutate(`/api/users?page=${currentPage}&limit=${rowsPerPage}`)
        }
      } catch (err: Error | any) {
      }
  }


  const handlePageChange = (newPage: number) => {
    const lastPage = data?.pagination?.last ?? 1;
    if (newPage >= 1 && newPage <= lastPage) {
      setCurrentPage(newPage);
    }
  };

  // Handler for rows per page change in pagination
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset page to the first page when the number of rows per page changes
  };

  // Handler for sorting change in table headers
  const handleSortChange = (property: keyof User) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc"); // Toggle sorting order when clicking the same header
    setOrderBy(property); // Set the field to sort by
  };

  // Memoized sorted data based on sorting criteria
  const sortedData = useMemo(() => {
    if (data && data?.data) {
      return data?.data?.filter((user: User) => user.role !== "admin").sort((a: User, b: User) => {
        const valueA = a[orderBy]; // Value of the field to sort by for user a
        const valueB = b[orderBy]; // Value of the field to sort by for user b

        // Handle null values by placing them at the end for ascending order
        if (valueA === null && valueB === null) {
          return 0;
        } else if (valueA === null) {
          return order === "asc" ? 1 : -1;
        } else if (valueB === null) {
          return order === "asc" ? -1 : 1;
        }

        // Compare the values and return the appropriate comparison result
        if (order === "asc") {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueB < valueA ? -1 : valueB > valueA ? 1 : 0;
        }
      });
    }
    return [];
  }, [data, orderBy, order]);


  // Manually trigger data re-fetch whenever page or rowsPerPage changes
  useEffect(() => {
    mutate(`/api/users?page=${currentPage}&limit=${rowsPerPage}`);
  }, [currentPage, rowsPerPage, mutate]);

  return <>
    {/* Table for displaying user data */}
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            {/* Sortable headers with onClick handlers for sorting */}
            <TableCell>
              <TableSortLabel
                  active={orderBy === "name"} // Highlight the header if currently sorted by "name"
                  direction={order} // Show the current sorting order (asc or desc)
                  onClick={handleSortChange("name")} // Trigger sorting by "name" when the header is clicked
              >
                Name
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                  active={orderBy === "email"}
                  direction={order}
                  onClick={handleSortChange("email")}
              >
                Email
              </TableSortLabel>
            </TableCell>
            <TableCell>
              Online Status
            </TableCell>
            <TableCell>
              Assign Trainer
            </TableCell>
            <TableCell>
              <TableSortLabel
                  active={orderBy === "role"}
                  direction={order}
                  onClick={handleSortChange("role")}
              >
                Role
              </TableSortLabel>
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Render sorted user data */}
          {/* Render user data from the response */}
          {sortedData?.map((user: User & {
            trainer: User | null;
          }, i: number) => (
              <TableRow key={user?.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{user?.name}</TableCell>
                <TableCell>{user?.email}</TableCell>
                <TableCell>{user?.isActive ? "🟢 Online" : "🔴 Offline"}</TableCell>
                <TableCell>
                  {user?.role === "user" && <Select
                      sx={{
                        width: '100%'
                      }}
                      defaultValue={user?.trainerId ?? ""}
                      onChange={(event) => handleChangeTrainer(event.target.value, user?.id)}
                      displayEmpty
                  >
                    <MenuItem value="" disabled>
                      Select a Trainer
                    </MenuItem>
                    {trainers?.map((trainer) => (
                        <MenuItem key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </MenuItem>
                    ))}
                  </Select>}
                </TableCell>
                <TableCell>{user?.role}</TableCell>
                <TableCell><Button variant={'contained'} color={'error'}>Delete</Button></TableCell>
              </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data?.count ?? 0}
        rowsPerPage={rowsPerPage}
        page={currentPage - 1} // TablePagination uses 0-based indexing, while our currentPage starts from 1
        onPageChange={(_event, newPage) => handlePageChange(newPage + 1)} // Adjust the 0-based index back to 1-based
        onRowsPerPageChange={(event) =>
            handleRowsPerPageChange(parseInt(event.target.value, 10))
        }
        labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to === -1 ? count : to} of ${count}`
        }
    /></>
};

export default ManageUser;
