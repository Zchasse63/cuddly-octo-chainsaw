'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
} from 'lucide-react';

// Mock client data
const mockClient = {
  id: '1',
  name: 'Sarah Mitchell',
  email: 'sarah.m@email.com',
  phone: '+1 (555) 123-4567',
  avatar: 'SM',
  program: 'Strength Builder',
  status: 'active',
  startDate: 'Jan 15, 2024',
  age: 28,
  weight: '145 lbs',
  height: '5\'6"',
  goals: ['Build muscle', 'Increase strength', 'Improve endurance'],
  stats: {
    workoutsCompleted: 48,
    totalVolume: '245,600 lbs',
    prsThisMonth: 5,
    currentStreak: 12,
    avgSessionTime: '52 min',
    attendanceRate: '92%',
  },
  recentWorkouts: [
    { id: '1', name: 'Upper Body Push', date: '2 hours ago', duration: '54 min', volume: '12,500 lbs', completed: true },
    { id: '2', name: 'Lower Body', date: 'Yesterday', duration: '62 min', volume: '18,200 lbs', completed: true },
    { id: '3', name: 'Upper Body Pull', date: '2 days ago', duration: '48 min', volume: '11,800 lbs', completed: true },
  ],
  recentRuns: [
    { id: '1', type: 'Easy Run', date: '3 days ago', distance: '5.2 km', pace: '5:45/km', duration: '30:00' },
    { id: '2', type: 'Tempo Run', date: '5 days ago', distance: '8.0 km', pace: '5:10/km', duration: '41:20' },
  ],
  personalRecords: [
    { exercise: 'Bench Press', weight: '135 lbs', date: 'Mar 10', isNew: true },
    { exercise: 'Squat', weight: '185 lbs', date: 'Mar 8', isNew: true },
    { exercise: 'Deadlift', weight: '225 lbs', date: 'Mar 5', isNew: false },
    { exercise: 'Overhead Press', weight: '85 lbs', date: 'Feb 28', isNew: false },
  ],
  notes: [
    { date: 'Mar 12', content: 'Mentioned slight shoulder discomfort. Adjusted pressing volume.' },
    { date: 'Mar 5', content: 'Great progress on squats! Increased working weight by 10 lbs.' },
  ],
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'programs' | 'messages'>('overview');

  const client = mockClient;

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
              {client.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-text-secondary">{client.program}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                client.status === 'active'
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'bg-accent-orange/10 text-accent-orange'
              }`}
            >
              {client.status}
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
          <button className="p-2 hover:bg-background-tertiary rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Dumbbell} label="Workouts" value={client.stats.workoutsCompleted.toString()} color="blue" />
        <StatCard icon={TrendingUp} label="Total Volume" value={client.stats.totalVolume} color="green" />
        <StatCard icon={Award} label="PRs This Month" value={client.stats.prsThisMonth.toString()} color="purple" />
        <StatCard icon={Activity} label="Current Streak" value={`${client.stats.currentStreak} days`} color="orange" />
        <StatCard icon={Clock} label="Avg Session" value={client.stats.avgSessionTime} color="blue" />
        <StatCard icon={Target} label="Attendance" value={client.stats.attendanceRate} color="green" />
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
              {client.recentWorkouts.map((workout) => (
                <div key={workout.id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-accent-blue" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{workout.name}</h3>
                      <p className="text-sm text-text-secondary">{workout.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{workout.volume}</p>
                      <p className="text-sm text-text-secondary">{workout.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Runs */}
          <Card variant="default" padding="none">
            <div className="p-6 border-b border-background-tertiary flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Runs</h2>
              <Link href="#" className="text-sm text-accent-blue hover:underline flex items-center">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-background-secondary">
              {client.recentRuns.map((run) => (
                <div key={run.id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                      <Footprints className="w-5 h-5 text-accent-green" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{run.type}</h3>
                      <p className="text-sm text-text-secondary">{run.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{run.distance}</p>
                      <p className="text-sm text-text-secondary">{run.pace}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Coach Notes */}
          <Card variant="default" padding="none">
            <div className="p-6 border-b border-background-tertiary flex items-center justify-between">
              <h2 className="text-lg font-semibold">Coach Notes</h2>
              <Button variant="ghost" size="sm">
                Add Note
              </Button>
            </div>
            <div className="divide-y divide-background-secondary">
              {client.notes.map((note, index) => (
                <div key={index} className="p-4">
                  <p className="text-sm text-text-secondary mb-1">{note.date}</p>
                  <p>{note.content}</p>
                </div>
              ))}
            </div>
          </Card>
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
                <Phone className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm">{client.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm">Started {client.startDate}</span>
              </div>
              <hr className="border-background-tertiary" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-semibold">{client.age}</p>
                  <p className="text-xs text-text-secondary">Age</p>
                </div>
                <div>
                  <p className="font-semibold">{client.weight}</p>
                  <p className="text-xs text-text-secondary">Weight</p>
                </div>
                <div>
                  <p className="font-semibold">{client.height}</p>
                  <p className="text-xs text-text-secondary">Height</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Goals */}
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

          {/* Personal Records */}
          <Card variant="bordered" padding="md">
            <h2 className="text-lg font-semibold mb-4">Personal Records</h2>
            <div className="space-y-3">
              {client.personalRecords.map((pr, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{pr.exercise}</p>
                    <p className="text-xs text-text-secondary">{pr.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{pr.weight}</span>
                    {pr.isNew && (
                      <span className="px-2 py-0.5 bg-accent-green/10 text-accent-green text-xs rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
