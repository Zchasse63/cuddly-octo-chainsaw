'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Calendar,
  Download,
} from 'lucide-react';

export default function AnalyticsPage() {
  const metrics = [
    {
      name: 'Total Revenue',
      value: '$45,231',
      change: '+12.5%',
      trend: 'up',
      period: 'vs last month',
      icon: DollarSign,
      color: 'text-accent-green',
    },
    {
      name: 'Active Clients',
      value: '247',
      change: '+8.2%',
      trend: 'up',
      period: 'vs last month',
      icon: Users,
      color: 'text-accent-blue',
    },
    {
      name: 'Workouts Logged',
      value: '3,847',
      change: '+23.1%',
      trend: 'up',
      period: 'vs last month',
      icon: Activity,
      color: 'text-accent-purple',
    },
    {
      name: 'Churn Rate',
      value: '2.3%',
      change: '-0.5%',
      trend: 'down',
      period: 'vs last month',
      icon: TrendingDown,
      color: 'text-accent-coral',
    },
  ];

  const weeklyData = [
    { day: 'Mon', workouts: 124, clients: 89 },
    { day: 'Tue', workouts: 156, clients: 102 },
    { day: 'Wed', workouts: 189, clients: 118 },
    { day: 'Thu', workouts: 167, clients: 95 },
    { day: 'Fri', workouts: 145, clients: 88 },
    { day: 'Sat', workouts: 98, clients: 67 },
    { day: 'Sun', workouts: 76, clients: 54 },
  ];

  const topPrograms = [
    { name: '12-Week Transformation', clients: 67, revenue: '$12,060' },
    { name: 'Strength Builder', clients: 45, revenue: '$8,100' },
    { name: 'Hypertrophy Focus', clients: 32, revenue: '$5,760' },
    { name: 'Marathon Prep', clients: 12, revenue: '$2,160' },
    { name: 'Powerlifting Peaking', clients: 14, revenue: '$2,520' },
  ];

  const clientRetention = [
    { month: 'Jan', rate: 94 },
    { month: 'Feb', rate: 96 },
    { month: 'Mar', rate: 95 },
    { month: 'Apr', rate: 97 },
    { month: 'May', rate: 97 },
    { month: 'Jun', rate: 98 },
  ];

  const maxWorkouts = Math.max(...weeklyData.map(d => d.workouts));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-text-secondary">Track your coaching business performance</p>
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 bg-background-primary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last 12 months</option>
            <option>All time</option>
          </select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name} variant="elevated" padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">{metric.name}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
                <div className="flex items-center mt-2">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-accent-green mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-accent-green mr-1" />
                  )}
                  <span className={`text-sm font-medium ${metric.trend === 'up' ? 'text-accent-green' : 'text-accent-green'}`}>
                    {metric.change}
                  </span>
                  <span className="text-xs text-text-tertiary ml-1">{metric.period}</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-background-secondary ${metric.color}`}>
                <metric.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Weekly Activity</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-blue" />
                <span className="text-sm text-text-secondary">Workouts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-purple" />
                <span className="text-sm text-text-secondary">Active Clients</span>
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between h-48 gap-2">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1 items-center">
                  <div
                    className="w-full max-w-8 bg-accent-blue/20 rounded-t-lg transition-all"
                    style={{ height: `${(day.workouts / maxWorkouts) * 140}px` }}
                  >
                    <div
                      className="w-full bg-accent-blue rounded-t-lg"
                      style={{ height: `${(day.workouts / maxWorkouts) * 100}%` }}
                    />
                  </div>
                  <div
                    className="w-full max-w-8 bg-accent-purple rounded-lg"
                    style={{ height: `${(day.clients / maxWorkouts) * 100}px` }}
                  />
                </div>
                <span className="text-xs text-text-secondary">{day.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Client Retention */}
        <Card variant="default" padding="md">
          <h2 className="text-lg font-semibold mb-6">Client Retention Rate</h2>
          <div className="flex items-end justify-between h-48 gap-4">
            {clientRetention.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                <div className="relative w-full">
                  <div
                    className="w-full bg-accent-green/20 rounded-t-lg"
                    style={{ height: '140px' }}
                  />
                  <div
                    className="absolute bottom-0 w-full bg-accent-green rounded-t-lg transition-all"
                    style={{ height: `${(month.rate / 100) * 140}px` }}
                  />
                </div>
                <span className="text-sm font-medium mt-2">{month.rate}%</span>
                <span className="text-xs text-text-secondary">{month.month}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Programs */}
      <Card variant="default" padding="none">
        <div className="p-6 border-b border-background-tertiary">
          <h2 className="text-lg font-semibold">Top Performing Programs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-tertiary">
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Program</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Active Clients</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Revenue</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Performance</th>
              </tr>
            </thead>
            <tbody>
              {topPrograms.map((program, index) => (
                <tr key={program.name} className="border-b border-background-secondary hover:bg-background-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{program.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{program.clients}</td>
                  <td className="px-6 py-4 text-accent-green font-medium">{program.revenue}</td>
                  <td className="px-6 py-4">
                    <div className="w-full max-w-32 bg-background-tertiary rounded-full h-2">
                      <div
                        className="bg-accent-blue rounded-full h-2"
                        style={{ width: `${(program.clients / topPrograms[0].clients) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
