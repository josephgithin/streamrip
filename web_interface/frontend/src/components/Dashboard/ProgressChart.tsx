import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format, subDays, startOfDay } from 'date-fns';

// Hooks
import { useDownloadContext } from '../../contexts/DownloadContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface ProgressChartProps {
  className?: string;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ className }) => {
  const theme = useTheme();
  const { queueStatus } = useDownloadContext();
  const { progressUpdates } = useWebSocket();

  // Generate sample data for the last 7 days
  const weeklyData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      data.push({
        date: format(date, 'MMM dd'),
        downloads: Math.floor(Math.random() * 20) + 5,
        completed: Math.floor(Math.random() * 18) + 3,
        failed: Math.floor(Math.random() * 3),
      });
    }
    return data;
  }, []);

  // Status distribution data
  const statusData = useMemo(() => {
    if (!queueStatus) return [];
    
    return [
      { name: 'Completed', value: queueStatus.completed, color: theme.palette.success.main },
      { name: 'Active', value: queueStatus.active, color: theme.palette.primary.main },
      { name: 'Queued', value: queueStatus.queued, color: theme.palette.warning.main },
      { name: 'Failed', value: queueStatus.failed, color: theme.palette.error.main },
    ].filter(item => item.value > 0);
  }, [queueStatus, theme]);

  // Real-time progress data
  const realtimeData = useMemo(() => {
    return progressUpdates.slice(-10).map((update, index) => ({
      time: format(new Date(update.timestamp), 'HH:mm:ss'),
      progress: update.progress,
      speed: parseFloat(update.speed?.replace(/[^\d.]/g, '') || '0'),
    }));
  }, [progressUpdates]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1.5,
            boxShadow: theme.shadows[8],
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color, fontSize: '0.875rem' }}
            >
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Card 
      className={className}
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Download Analytics
          </Typography>
        </Box>

        {/* Weekly Downloads Trend */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
            Weekly Downloads
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="downloads"
                stroke={theme.palette.primary.main}
                fillOpacity={1}
                fill="url(#downloadGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke={theme.palette.success.main}
                fillOpacity={1}
                fill="url(#completedGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        {/* Status Distribution */}
        {statusData.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Current Status Distribution
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <ResponsiveContainer width="40%" height={120}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              <Box sx={{ flex: 1 }}>
                {statusData.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {item.name}
                    </Typography>
                    <Chip
                      label={item.value}
                      size="small"
                      sx={{
                        backgroundColor: alpha(item.color, 0.1),
                        color: item.color,
                        fontWeight: 600,
                        minWidth: 40,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* Real-time Progress */}
        {realtimeData.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ScheduleIcon sx={{ mr: 1, color: 'secondary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                Real-time Progress
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={realtimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.2)} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="progress"
                  fill={theme.palette.secondary.main}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressChart;
