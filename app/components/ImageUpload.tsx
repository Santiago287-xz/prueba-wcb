"use client";
import { CldUploadButton } from "next-cloudinary";
import Image from "next/image";
import React, { useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Box, Typography, CircularProgress } from "@mui/material";

interface ImageUploadProps {
  value: string;
  setValue: any;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, setValue }) => {
  const [loading, setLoading] = useState(false);

  return (
    <Box sx={{ width: "100%", mb: 2 }}>
      <CldUploadButton
        uploadPreset="gym_management_system"
        onSuccess={(result: any) => {
          setLoading(false);
          setValue("image", result.info.secure_url, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }}
        onUpload={() => {
          setLoading(true);
        }}
        options={{
          maxFiles: 1,
        }}
      >
        <Box
          sx={{
            position: "relative",
            cursor: loading ? "wait" : "pointer",
            width: "100%",
            height: value ? "200px" : "150px",
            border: "2px dashed #d4d4d4",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            color: "#525252",
            backgroundColor: "#f8f8f8",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#0078FF",
              backgroundColor: "#f0f0f0",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={40} />
          ) : !value ? (
            <>
              <CloudUploadIcon sx={{ fontSize: 40 }} />
              <Typography variant="body1">
                Click to upload image
              </Typography>
            </>
          ) : null}

          {value && !loading && (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <Image
                src={value}
                alt="Uploaded image"
                fill
                style={{
                  objectFit: "cover",
                }}
              />
            </Box>
          )}
        </Box>
      </CldUploadButton>
    </Box>
  );
};

export default ImageUpload;