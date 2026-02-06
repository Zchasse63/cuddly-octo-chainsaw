'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Clock,
  Award,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash,
  ChevronRight,
  Target,
  Footprints,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AIBadge } from '@/components/ai/AIBadge';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'programs' | 'messages'>('overview');

  const clientId = params.id as string;

  const { data: clientData, isLoading, error } = trpc.coachDashboard.getClientDetail.useQuery({
    clientId,
  });

  const { data: healthSummary, isLoading: healthLoading } = trpc.coachDashboard.getAIHealthSummary.useQuery({ clientId }, { enabled: !!clientData });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-blue" />
          <p className="text-text-secondary">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-accent-red" />
          <h2 className="text-xl font-semibold mb-2">Failed to load client</h2>
          <p className="text-text-secondary mb-4">{error.message}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-accent-orange" />
          <h2 className="text-xl font-semibold mb-2">Client not found</h2>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date helper
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format duration helper
  const formatDuration = (startTime: Date | string | null | undefined, endTime: Date | string | null | undefined) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
    return `${minutes} min`;
  };

  // Calculate workout stats
  const completedWorkouts = clientData.recentWorkouts.filter(w => w.status === 'completed');
  const workoutCount = completedWorkouts.length;

  const client = clientData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-bold text-xl">
              {getInitials(client.name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-text-secondary">
                {client.activeProgram?.name || 'No active program'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-accent-green/10 text-accent-green">
              Active
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <button
            aria-label="More actions"
            className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Dumbbell} label="Workouts" value={workoutCount.toString()} color="blue" />
        <StatCard
          icon={Activity}
          label="Readiness"
          value={client.latestReadiness?.overallScore ? `${client.latestReadiness.overallScore}/10` : 'N/A'}
          color="green"
        />
        <StatCard
          icon={Target}
          label="Experience"
          value={client.experienceLevel || 'N/A'}
          color="purple"
        />
        <StatCard
          icon={Award}
          label="Program"
          value={client.activeProgram?.programType || 'None'}
          color="orange"
        />
        <StatCard
          icon={Clock}
          label="Program Weeks"
          value={client.activeProgram?.durationWeeks ? `${client.activeProgram.durationWeeks}w` : 'N/A'}
          color="blue"
        />
        <StatCard
          icon={Calendar}
          label="Days/Week"
          value={client.activeProgram?.daysPerWeek ? `${client.activeProgram.daysPerWeek}d` : 'N/A'}
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-background-tertiary">
        <nav className="flex gap-4">
          {(['overview', 'workouts', 'programs', 'messages'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Workouts */}
          <Card variant="default" padding="none">
            <div className="p-6 border-b border-background-tertiary flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Workouts</h2>
              <Link href="#" className="text-sm text-accent-blue hover:underline flex items-center">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-background-secondary">
              {client.recentWorkouts.length > 0 ? (
                client.recentWorkouts.map((workout) => (
                  <div key={workout.id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-accent-blue" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{workout.name || 'Workout'}</h3>
                        <p className="text-sm text-text-secondary">
                          {formatDate(workout.startedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium capitalize">{workout.status}</p>
                        <p className="text-sm text-text-secondary">
                          {formatDuration(workout.startedAt, workout.completedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-text-secondary">
                  <Dumbbell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No workouts recorded yet</p>
                </div>
              )}
            </div>
          </Card>

          {/* Program Details */}
          {client.activeProgram && (
            <Card variant="default" padding="md">
              <h2 className="text-lg font-semibold mb-4">Active Program</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-lg">{client.activeProgram.name}</h3>
                  {client.activeProgram.description && (
                    <p className="text-sm text-text-secondary mt-1">{client.activeProgram.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-background-tertiary">
                  <div>
                    <p className="text-sm text-text-secondary">Program Type</p>
                    <p className="font-medium capitalize">{client.activeProgram.programType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Status</p>
                    <p className="font-medium capitalize">{client.activeProgram.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Duration</p>
                    <p className="font-medium">{client.activeProgram.durationWeeks} weeks</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Days/Week</p>
                    <p className="font-medium">{client.activeProgram.daysPerWeek} days</p>
                  </div>
                  {client.activeProgram.startDate && (
                    <div>
                      <p className="text-sm text-text-secondary">Start Date</p>
                      <p className="font-medium">{formatDate(client.activeProgram.startDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Health Data */}
          {client.latestReadiness && (
            <Card variant="default" padding="md">
              <h2 className="text-lg font-semibold mb-4">Latest Readiness</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Overall Score</span>
                  <span className="text-2xl font-bold text-accent-blue">
                    {client.latestReadiness.overallScore}/10
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-background-tertiary">
                  <div>
                    <p className="text-sm text-text-secondary">Sleep Quality</p>
                    <p className="font-medium">{client.latestReadiness.sleepQuality}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Stress</p>
                    <p className="font-medium">{client.latestReadiness.stress}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Soreness</p>
                    <p className="font-medium">{client.latestReadiness.soreness}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Energy</p>
                    <p className="font-medium">{client.latestReadiness.energyLevel}/10</p>
                  </div>
                </div>
                {client.latestReadiness.notes && (
                  <div className="pt-3 border-t border-background-tertiary">
                    <p className="text-sm text-text-secondary mb-1">Notes</p>
                    <p className="text-sm">{client.latestReadiness.notes}</p>
                  </div>
                )}
                <p className="text-xs text-text-tertiary">
                  Recorded on {formatDate(client.latestReadiness.date)}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card variant="bordered" padding="md">
            <h2 className="text-lg font-semibold mb-4">Client Info</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm">{client.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm capitalize">{client.experienceLevel || 'Unknown'}</span>
              </div>
              {client.activeProgram && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm">
                    Program started {formatDate(client.activeProgram.startDate)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* AI Health Summary */}
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent-purple" />
              <h2 className="text-lg font-semibold">AI Health Summary</h2>
            </div>
            {healthLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : healthSummary ? (
              <div className="space-y-4">
                {/* Status Indicator */}
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    healthSummary.status === 'green' ? 'bg-accent-green' :
                    healthSummary.status === 'yellow' ? 'bg-accent-orange' :
                    'bg-accent-red'
                  }`} />
                  <span className="text-sm font-medium">
                    {healthSummary.status === 'green' ? 'Good health status' :
                     healthSummary.status === 'yellow' ? 'Monitor closely' :
                     'Needs attention'}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-sm text-text-secondary">{healthSummary.summary}</p>

                {/* Risk Factors */}
                {healthSummary.riskFactors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Risk Factors</h3>
                    <ul className="space-y-1">
                      {healthSummary.riskFactors.map((factor, i) => (
                        <li key={i} className="text-sm text-accent-orange flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {healthSummary.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-text-secondary">• {rec}</li>
                    ))}
                  </ul>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-text-tertiary">
                  Last analyzed: {new Date(healthSummary.analyzedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary text-center">Health analysis unavailable</p>
            )}
          </Card>

          {/* Goals */}
          {client.goals && client.goals.length > 0 && (
            <Card variant="bordered" padding="md">
              <h2 className="text-lg font-semibold mb-4">Goals</h2>
              <div className="space-y-2">
                {client.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-accent-blue" />
                    <span className="text-sm">{goal}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Workout Summary */}
          <Card variant="bordered" padding="md">
            <h2 className="text-lg font-semibold mb-4">Workout Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Total Workouts</span>
                <span className="font-semibold">{client.recentWorkouts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Completed</span>
                <span className="font-semibold">{completedWorkouts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Active</span>
                <span className="font-semibold">
                  {client.recentWorkouts.filter(w => w.status === 'active').length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-accent-blue/10 text-accent-blue',
    green: 'bg-accent-green/10 text-accent-green',
    purple: 'bg-accent-purple/10 text-accent-purple',
    orange: 'bg-accent-orange/10 text-accent-orange',
  };

  return (
    <Card variant="bordered" padding="md">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-text-secondary">{label}</p>
        </div>
      </div>
    </Card>
  );
}
