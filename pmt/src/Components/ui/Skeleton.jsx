import React from "react";
import { Skeleton, Stack } from "@mui/material";
import { styled } from '@mui/material/styles';

const SkeletonContainer = styled(Stack)(({ theme }) => ({
  display: "flex",
  height: "90vh",
  margin: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 2,
  overflow: "hidden",
  boxShadow: theme.shadows[10],
  background: theme.palette.background.paper,
}));

const ChatSkeleton = () => {
  return (
    <SkeletonContainer>
      {/* Main Chat Area Skeleton */}
      <Stack sx={{ flex: 3, display: "flex", flexDirection: "column" }}>
        {/* Header Skeleton */}
        <Stack sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="text" width="20%" height={20} sx={{ mt: 1 }} />
        </Stack>

        {/* Messages Area Skeleton */}
        <Stack sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {[...Array(5)].map((_, index) => (
            <Stack
              key={index}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: index % 2 === 0 ? "flex-start" : "flex-end",
                mb: 2,
              }}
            >
              <Stack
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="text" width={100} height={20} />
              </Stack>
              <Skeleton
                variant="rectangular"
                width={Math.random() * 200 + 100}
                height={60}
                sx={{ borderRadius: 2 }}
              />
              <Skeleton variant="text" width={50} height={16} sx={{ mt: 1 }} />
            </Stack>
          ))}
        </Stack>

        {/* Input Area Skeleton */}
        <Stack sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={40}
              sx={{ borderRadius: 25 }}
            />
            <Skeleton
              variant="rectangular"
              width={100}
              height={40}
              sx={{ borderRadius: 25 }}
            />
          </Stack>
        </Stack>
      </Stack>

      {/* Active Users Panel Skeleton */}
      <Stack
        sx={{
          flex: 1,
          borderLeft: "1px solid",
          borderColor: "divider",
          p: 2,
        }}
      >
        <Skeleton variant="text" width="40%" height={40} />
        <Stack sx={{ mt: 2 }}>
          {[...Array(3)].map((_, index) => (
            <Stack key={index} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={100} height={20} />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </SkeletonContainer>
  );
};

export default ChatSkeleton;