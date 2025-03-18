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
import { TablePagination, Typography } from "@mui/material";
import { User } from "@prisma/client";
import useStudentsStore from "@/app/hooks/useStudentsStore";
import Loading from "@/app/loading";
import Link from "next/link";

const StudentsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0); // 0-based indexing
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof User>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const { loading, students, fetchStudents } = useStudentsStore();

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1) {
      setCurrentPage(newPage);
    }
  };

  // Handler for rows per page change in pagination
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset page to the first page when the number of rows per page changes
  };
  const handleSortChange = (property: keyof User) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
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

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Typography variant="h2">Students</Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
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
              <TableCell>
                <TableSortLabel
                  active={orderBy === "email"}
                  direction={order}
                  onClick={handleSortChange("email")}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData
              .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
              .map((user: User, index: number) => (
                <TableRow key={user?.id}>
                  <TableCell>{currentPage * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{user?.name}</TableCell>
                  <TableCell>{user?.email}</TableCell>
                  <TableCell>
                    <Link href={`/students/${user?.id}`}>View</Link>
                  </TableCell>
                  {/* Display other user data here */}
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
