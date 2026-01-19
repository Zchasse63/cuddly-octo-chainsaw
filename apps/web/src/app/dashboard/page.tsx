'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ScheduleSessionModal } from '@/components/scheduling/ScheduleSessionModal';
import { trpc } from '@/lib/trpc';
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(timestamp: Date | string | null | undefined): string {
  if (!timestamp) return 'Unknown time';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) !== 1 ? 's' : ''} ago`;
}

function formatSessionTime(scheduledAt: Date | string): string {
  const date = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${month} ${day}, ${time}`;
}

export default function DashboardPage() {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = trpc.coachDashboard.getDashboardSummary.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-text-secondary">Welcome back</p>
        </div>
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-text-secondary">Welcome back</p>
        </div>
        <ErrorMessage error={error} retry={() => refetch()} />
      </div>
    );
  }

  const stats = [
    {
      name: 'Active Clients',
      value: data?.activeClients.toString() || '0',
      change: '+12%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-accent-blue',
    },
    {
      name: 'Monthly Revenue',
      value: '$0',
      change: '+0%',
      changeType: 'increase',
      icon: DollarSign,
      color: 'bg-accent-green',
    },
    {
      name: 'Workouts This Week',
      value: data?.workoutsThisWeek.toString() || '0',
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

  const recentActivity = (data?.recentActivity || []).map(activity => ({
    client: activity.clientName,
    action: activity.action,
    program: '',
    time: formatTimeAgo(activity.timestamp),
    avatar: getInitials(activity.clientName),
  }));

  const upcomingSessions = (data?.upcomingSessions || []).map(session => ({
    id: session.id,
    client: session.clientName,
    type: session.sessionType,
    time: formatSessionTime(session.scheduledAt),
    avatar: getInitials(session.clientName),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-text-secondary">Welcome back</p>
      </div>

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
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
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
                    {activity.program && (
                      <p className="text-sm text-text-secondary truncate">
                        {activity.program}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary whitespace-nowrap">
                    {activity.time}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-text-secondary">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </Card>

        <Card variant="default" padding="none">
          <div className="p-6 border-b border-background-tertiary">
            <h2 className="text-lg font-semibold">Upcoming Sessions</h2>
          </div>
          {upcomingSessions.length > 0 ? (
            <div className="p-4 space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl bg-background-secondary hover:bg-background-tertiary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-purple/10 text-accent-purple flex items-center justify-center font-medium text-sm">
                      {session.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{session.client}</p>
                      <p className="text-sm text-text-secondary capitalize">{session.type}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-accent-blue font-medium">
                      {session.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-text-secondary">
              <p className="mb-2">No upcoming sessions</p>
              <p className="text-sm">Schedule one now!</p>
            </div>
          )}
          <div className="p-4 border-t border-background-tertiary">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="w-full py-2 text-sm text-accent-blue hover:underline"
            >
              Schedule New Session
            </button>
          </div>
        </Card>
      </div>

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

      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
