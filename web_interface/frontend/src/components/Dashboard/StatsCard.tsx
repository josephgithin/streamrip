import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
}) => {
  const theme = useTheme();
  const isPositiveTrend = trend?.startsWith('+') || trend === 'Live';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${alpha(color, 0.05)}, ${alpha(color, 0.02)})`,
          border: `1px solid ${alpha(color, 0.1)}`,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            border: `1px solid ${alpha(color, 0.2)}`,
            boxShadow: `0 8px 32px ${alpha(color, 0.15)}`,
          },
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${alpha(color, 0.1)}, ${alpha(color, 0.05)})`,
          }}
        />
        
        <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: alpha(color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
              }}
            >
              {icon}
            </Box>
            
            {trend && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: alpha(
                    isPositiveTrend ? theme.palette.success.main : theme.palette.error.main,
                    0.1
                  ),
                }}
              >
                {trend !== 'Live' && (
                  isPositiveTrend ? (
                    <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />
                  )
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: trend === 'Live' 
                      ? color 
                      : isPositiveTrend 
                        ? 'success.main' 
                        : 'error.main',
                  }}
                >
                  {trend}
                </Typography>
              </Box>
            )}
          </Box>
          
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            {value.toLocaleString()}
          </Typography>
          
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
