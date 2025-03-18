"use client";

import Empty from "@/app/components/Empty";
import Loading from "@/app/loading";
import axios from "axios";
import {useSearchParams} from "next/navigation";
import useSWR from "swr";
import React, {useRef} from "react";
import {Button, Container, Typography} from "@mui/material/";
import {Divider, Grid, Table, TableBody, TableCell, TableContainer, TableRow} from "@mui/material";
import Image from "next/image";

import html2canvas from 'html2canvas';
import JSPDF from "jspdf";

const fetcher = async (...args: Parameters<typeof axios>) => {
    const res = await axios(...args);
    return res.data;
};

const SuccessPage: React.FC = () => {
    const searchParams = useSearchParams();

    const sessionId = searchParams.get("session_id");

    const URL = sessionId ? `/api/payment/${sessionId}` : null;

    const {data, isLoading, error} = useSWR(URL, fetcher, {
        revalidateOnFocus: false,
    });

    const pdfRef = useRef<HTMLDivElement | null>(null);

    const downloadPdf = () => {
        if (pdfRef?.current) {
            html2canvas(pdfRef?.current).then(function (canvas) {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new JSPDF("p", "mm", "a4", true);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                const imageWidth = canvas.width;
                const imageHeight = canvas.height;

                const ratio = Math.min(pdfWidth / imageWidth, pdfHeight / imageHeight);
                const imgX = (pdfWidth - imageWidth * ratio) / 2;
                const imgY = (pdfHeight - imageHeight * ratio) / 2;
                pdf.addImage(imgData, 'PNG', imgX, imgY, imageWidth * ratio, imageHeight * ratio);
                pdf.save(`${data?.checkoutSession?.metadata?.description}.pdf`);
            })
        }
    }

    if (error) {
        return (
            <Empty
                title="Failed"
                subtitle={error.response.data.error}
            />
        );
    }

    if (isLoading) {
        return <Loading/>;
    }

    return <>
        <Container maxWidth={'xl'} ref={pdfRef}>
            <Typography variant={'h6'} fontSize={12} color={'secondary'}>Payment Successful</Typography>
            <Typography variant={'h5'} fontSize={{
                xs: 16,
                sm: 20,
                md: 26,
                lg: 30,
            }} fontWeight={"bolder"}>Thank you for your payment</Typography>

            <br/>

            <Typography variant={'h6'} fontSize={12} color={'secondary'}>Your payment id</Typography>
            <Typography variant={'h6'} fontSize={13}>{data?.checkoutSession?.payment_intent?.id}</Typography>

            <Divider sx={{my: 2}}/>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={3} md={3} lg={3}>
                    <Image src={"/logo.png"} alt={"company_logo"} width={200} height={200}/>
                </Grid>
                <Grid item xs={12} sm={9} md={9} lg={9}>
                    <Typography variant={'h6'} fontSize={12} color={'secondary'}>Description</Typography>
                    <Typography variant={'h6'} fontSize={16}>{data?.checkoutSession?.metadata?.description}</Typography>
                    <br/>
                    <Typography variant={'h6'} fontSize={12} color={'secondary'}>Amount</Typography>
                    <Typography variant={'h6'} fontSize={16}>${data?.checkoutSession?.amount_total / 100}</Typography>
                </Grid>
            </Grid>
            <Divider sx={{my: 2}}/>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={3} md={3} lg={3}>
                    <Typography variant={'h6'} fontSize={12} color={'secondary'}>Payment Method</Typography>
                    <Typography variant={'h6'}
                                fontSize={16}>{data?.checkoutSession?.payment_intent?.payment_method_types[0]}</Typography>
                </Grid>
                <Grid item xs={12} sm={9} md={9} lg={9}>
                    <Typography variant={'h6'} fontSize={12} color={'secondary'}>Billing Information</Typography>
                    <Typography variant={'h6'}
                                fontSize={16}>Name: {data?.checkoutSession?.customer_details?.name}</Typography>
                    <Typography variant={'h6'}
                                fontSize={16}>Email: {data?.checkoutSession?.customer_details?.email}</Typography>
                    <Typography variant={'h6'}
                                fontSize={16}>City: {data?.checkoutSession?.customer_details?.address?.city}</Typography>
                    <Typography variant={'h6'} fontSize={16}>Postal
                        Code: {data?.checkoutSession?.customer_details?.address?.postal_code}</Typography>
                    <Typography variant={'h6'}
                                fontSize={16}>Country: {data?.checkoutSession?.customer_details?.address?.country}</Typography>
                </Grid>
            </Grid>

            <Divider sx={{my: 2}}/>

            <TableContainer>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>
                                <Typography variant={'h6'} fontSize={12} color={'secondary'}>Subtotal</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant={'h6'}
                                            fontSize={16}>${data?.checkoutSession?.amount_subtotal / 100}</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <Typography variant={'h6'} fontSize={12} color={'secondary'}>Tax</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant={'h6'}
                                            fontSize={16}>${data?.checkoutSession?.total_details?.amount_tax / 100}</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <Typography variant={'h6'} fontSize={12} color={'secondary'}>Discount</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant={'h6'}
                                            fontSize={16}>${data?.checkoutSession?.total_details?.amount_discount / 100}</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <Typography variant={'h6'} fontSize={12} color={'secondary'}>Total</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant={'h6'}
                                            fontSize={16}>${data?.checkoutSession?.amount_total / 100}</Typography>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>

        <Button sx={{
            mt: 2,
            ml: 2
        }} variant={'contained'} color={'primary'} onClick={downloadPdf}>Download PDF</Button>
    </>
};

export default SuccessPage;