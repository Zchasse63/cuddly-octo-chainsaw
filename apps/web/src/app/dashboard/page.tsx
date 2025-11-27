'use client';

import { Card } from '@/components/ui/Card';
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const stats = [
    {
      name: 'Active Clients',
      value: '247',
      change: '+12%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-accent-blue',
    },
    {
      name: 'Monthly Revenue',
      value: '$12,450',
      change: '+8%',
      changeType: 'increase',
      icon: DollarSign,
      color: 'bg-accent-green',
    },
    {
      name: 'Workouts This Week',
      value: '1,892',
      change: '+23%',
      changeType: 'increase',
      icon: Activity,
      color: 'bg-accent-purple',
    },
    {
      name: 'Avg Session Time',
      value: '54 min',
      change: '-5%',
      changeType: 'decrease',
      icon: Clock,
      color: 'bg-accent-orange',
    },
  ];

  const recentActivity = [
    {
      client: 'Sarah M.',
      action: 'completed workout',
      program: 'Strength Builder',
      time: '5 min ago',
      avatar: 'SM',
    },
    {
      client: 'Mike R.',
      action: 'logged PR',
      program: 'Bench Press - 225 lbs',
      time: '12 min ago',
      avatar: 'MR',
    },
    {
      client: 'Emily K.',
      action: 'started program',
      program: '12-Week Transformation',
      time: '1 hour ago',
      avatar: 'EK',
    },
    {
      client: 'James T.',
      action: 'sent message',
      program: 'Question about form',
      time: '2 hours ago',
      avatar: 'JT',
    },
    {
      client: 'Lisa W.',
      action: 'completed week 8',
      program: 'Marathon Prep',
      time: '3 hours ago',
      avatar: 'LW',
    },
  ];

  const upcomingSessions = [
    {
      client: 'David Chen',
      type: 'Check-in Call',
      time: '2:00 PM',
      avatar: 'DC',
    },
    {
      client: 'Anna Smith',
      type: 'Program Review',
      time: '4:30 PM',
      avatar: 'AS',
    },
    {
      client: 'Tom Brown',
      type: 'Initial Consultation',
      time: 'Tomorrow 10:00 AM',
      avatar: 'TB',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-text-secondary">Welcome back, John</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} variant="elevated" padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">{stat.name}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.changeType === 'increase' ? (
                    <ArrowUpRight className="w-4 h-4 text-accent-green" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-accent-red" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === 'increase'
                        ? 'text-accent-green'
                        : 'text-accent-red'
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-xs text-text-tertiary ml-1">vs last month</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card variant="default" padding="none" className="lg:col-span-2">
          <div className="p-6 border-b border-background-tertiary">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <Link
                href="/dashboard/activity"
                className="text-sm text-accent-blue hover:underline flex items-center"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-background-secondary">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 hover:bg-background-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-medium text-sm">
                  {activity.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    <span className="text-accent-blue">{activity.client}</span>{' '}
                    {activity.action}
                  </p>
                  <p className="text-sm text-text-secondary truncate">
                    {activity.program}
                  </p>
                </div>
                <p className="text-xs text-text-tertiary whitespace-nowrap">
                  {activity.time}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Sessions */}
        <Card variant="default" padding="none">
          <div className="p-6 border-b border-background-tertiary">
            <h2 className="text-lg font-semibold">Upcoming Sessions</h2>
          </div>
          <div className="p-4 space-y-3">
            {upcomingSessions.map((session, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-background-secondary hover:bg-background-tertiary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-purple/10 text-accent-purple flex items-center justify-center font-medium text-sm">
                    {session.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{session.client}</p>
                    <p className="text-sm text-text-secondary">{session.type}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-accent-blue font-medium">
                    {session.time}
                  </p>
                  <button className="text-xs px-3 py-1 bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-colors">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-background-tertiary">
            <button className="w-full py-2 text-sm text-accent-blue hover:underline">
              Schedule New Session
            </button>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="bordered" padding="md">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/clients/new"
            className="p-4 rounded-xl bg-background-secondary hover:bg-background-tertiary transition-colors text-center"
          >
            <Users className="w-6 h-6 mx-auto mb-2 text-accent-blue" />
            <p className="font-medium text-sm">Add Client</p>
          </Link>
          <Link
            href="/dashboard/programs/new"
            className="p-4 rounded-xl bg-background-secondary hover:bg-background-tertiary transition-colors text-center"
          >
            <Activity className="w-6 h-6 mx-auto mb-2 text-accent-green" />
            <p className="font-medium text-sm">Create Program</p>
          </Link>
          <Link
            href="/dashboard/messages"
            className="p-4 rounded-xl bg-background-secondary hover:bg-background-tertiary transition-colors text-center"
          >
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-accent-purple" />
            <p className="font-medium text-sm">View Reports</p>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="p-4 rounded-xl bg-background-secondary hover:bg-background-tertiary transition-colors text-center"
          >
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-accent-orange" />
            <p className="font-medium text-sm">Revenue</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
