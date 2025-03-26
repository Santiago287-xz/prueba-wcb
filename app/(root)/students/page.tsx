"use client";
import { useState, useMemo, useEffect } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TableSortLabel from "@mui/material/TableSortLabel";
import { TablePagination, Typography, useMediaQuery, useTheme } from "@mui/material";
import { User } from "@prisma/client";
import useStudentsStore from "@/app/hooks/useStudentsStore";
import EditIcon from "@mui/icons-material/Edit";
import { useRouter } from "next/navigation";

const StudentsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof User>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();

  const { loading, students, fetchStudents } = useStudentsStore();

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(0);
  };

  const handleSortChange = (property: keyof User) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleRowClick = (userId: string) => {
    router.push(`/students/${userId}`);
  };

  const sortedData = useMemo(() => {
    if (students && students.length > 0) {
      return [...students].sort((a: User, b: User) => {
        const valueA = a[orderBy];
        const valueB = b[orderBy];

        if (valueA === null && valueB === null) {
          return 0;
        } else if (valueA === null) {
          return order === "asc" ? 1 : -1;
        } else if (valueB === null) {
          return order === "asc" ? -1 : 1;
        }

        if (order === "asc") {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueB < valueA ? -1 : valueB > valueA ? 1 : 0;
        }
      });
    }
    return [];
  }, [students, orderBy, order]);

  return (
    <>
      <Typography variant="h2">Students</Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: isMobile ? 300 : 650 }} aria-label="students table">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={order}
                  onClick={handleSortChange("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              {!isMobile && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "email"}
                    direction={order}
                    onClick={handleSortChange("email")}
                  >
                    Email
                  </TableSortLabel>
                </TableCell>
              )}
              <TableCell>
                <TableSortLabel
                  active={orderBy === "phone"}
                  direction={order}
                  onClick={handleSortChange("phone")}
                >
                  Phone
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData
              .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
              .map((user: User, index: number) => (
                <TableRow 
                  key={user?.id}
                  hover
                  onClick={() => handleRowClick(user?.id)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <TableCell>{currentPage * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{user?.name}</TableCell>
                  {!isMobile && <TableCell>{user?.email}</TableCell>}
                  <TableCell>{user?.phone}</TableCell>
                  <TableCell align="center">
                    <EditIcon color="primary" fontSize="small" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={students.length ?? 0}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={(event, newPage) => setCurrentPage(newPage)}
        onRowsPerPageChange={(event) =>
          handleRowsPerPageChange(parseInt(event.target.value, 10))
        }
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to === -1 ? count : to} of ${count}`
        }
      />
    </>
  );
};

export default StudentsPage;