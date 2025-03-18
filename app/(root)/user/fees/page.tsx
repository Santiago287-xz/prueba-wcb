"use client";

import useSWR from "swr";
import axios from "axios";
import { useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Chip,
  Button,
} from "@mui/material";

import { Fees } from "@prisma/client";
import Loading from "@/app/loading";
import Empty from "@/app/components/Empty";

import getStripe from "@/app/libs/getStripe";
import toast from "react-hot-toast";
import { LoadingButton } from "@mui/lab";
import { PuffLoader } from "react-spinners";

const fetcher = async (...args: Parameters<typeof axios>) => {
  const res = await axios(...args);
  return res.data;
};

const MyFeesPage = () => {
  const { data, isLoading } = useSWR("/api/user/fees", fetcher, {
    refreshInterval: 1000,
  });

  const fees = data?.fees;

  const [loadingPayment, setLoadingPayment] = useState<boolean>(false);
  const [paymentId, setPaymentId] = useState<string>("");

  const [orderBy, setOrderBy] = useState<keyof Fees>("month");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const handleSortChange = (property: keyof Fees) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = useMemo(() => {
    if (fees && fees?.length > 0) {
      return [...fees].sort((a: Fees, b: Fees) => {
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
  }, [fees, orderBy, order]);

  const handlePay = async (fee: Fees) => {
    try {
      setLoadingPayment(true);
      setPaymentId(fee.id);

      const stripe = await getStripe();

      if (!stripe) {
        return;
      }

      const res = await axios.post("/api/payment", {
        amount: fee.amount,
        description: fee.message,
        email: fee.email,
        feeId: fee.id,
        month: fee.month,
        year: fee.year,
      });

      if (res.data) {
        toast.loading("Redirecting to Stripe Checkout...");

        await stripe.redirectToCheckout({
          sessionId: res.data.stripeSession.id,
        });
      }
    } catch (err) {
    } finally {
      setLoadingPayment(false);
      setPaymentId("");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Box>
      {fees?.length > 0 ? (
        <TableContainer
          sx={{
            mt: 4,
          }}
          component={Paper}
        >
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "month"}
                    direction={order}
                    onClick={handleSortChange("month")}
                  >
                    Month
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "year"}
                    direction={order}
                    onClick={handleSortChange("year")}
                  >
                    Year
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "amount"}
                    direction={order}
                    onClick={handleSortChange("amount")}
                  >
                    Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((fee: Fees, index: number) => (
                <TableRow key={fee?.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{fee?.month}</TableCell>
                  <TableCell>{fee?.year}</TableCell>
                  <TableCell>{fee?.amount}</TableCell>
                  <TableCell>
                    {fee?.isPaid && fee.transactionId ? (
                      <Chip
                        label="Paid"
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Chip
                        label="Unpaid"
                        color="secondary"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {!fee?.isPaid && !fee.transactionId && (
                      <LoadingButton
                        loading={paymentId === fee.id && loadingPayment}
                        type="button"
                        onClick={() => handlePay(fee)}
                      >
                        Pay
                      </LoadingButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Empty title="Fees Unavailable" subtitle="You have no fees, yet!" />
      )}
    </Box>
  );
};

export default MyFeesPage;
