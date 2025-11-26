'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

const mockClients = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    email: 'sarah.m@email.com',
    avatar: 'SM',
    program: 'Strength Builder',
    status: 'active',
    lastWorkout: '2 hours ago',
    workoutsThisWeek: 4,
    startDate: 'Jan 15, 2024',
  },
  {
    id: '2',
    name: 'Mike Rodriguez',
    email: 'mike.r@email.com',
    avatar: 'MR',
    program: 'Hypertrophy Focus',
    status: 'active',
    lastWorkout: '1 day ago',
    workoutsThisWeek: 3,
    startDate: 'Feb 1, 2024',
  },
  {
    id: '3',
    name: 'Emily Kim',
    email: 'emily.k@email.com',
    avatar: 'EK',
    program: '12-Week Transformation',
    status: 'active',
    lastWorkout: '3 hours ago',
    workoutsThisWeek: 5,
    startDate: 'Dec 10, 2023',
  },
  {
    id: '4',
    name: 'James Thompson',
    email: 'james.t@email.com',
    avatar: 'JT',
    program: 'Marathon Prep',
    status: 'paused',
    lastWorkout: '5 days ago',
    workoutsThisWeek: 0,
    startDate: 'Mar 1, 2024',
  },
  {
    id: '5',
    name: 'Lisa Wang',
    email: 'lisa.w@email.com',
    avatar: 'LW',
    program: 'Weight Loss',
    status: 'active',
    lastWorkout: '6 hours ago',
    workoutsThisWeek: 4,
    startDate: 'Jan 20, 2024',
  },
];

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-text-secondary">Manage your coaching roster</p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card variant="bordered" padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'paused')}
              className="px-4 py-2 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Clients List */}
      <div className="grid gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} variant="elevated" padding="none">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-semibold">
                  {client.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{client.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.status === 'active'
                          ? 'bg-accent-green/10 text-accent-green'
                          : 'bg-accent-orange/10 text-accent-orange'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>
                  <p className="text-text-secondary">{client.program}</p>
                </div>
                <button className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">Started {client.startDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">{client.workoutsThisWeek} workouts this week</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Last workout: {client.lastWorkout}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/dashboard/clients/${client.id}`}>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
                <Button variant="ghost" size="sm">
                  <Mail className="w-4 h-4 mr-1" />
                  Message
                </Button>
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card variant="bordered" padding="lg" className="text-center">
          <p className="text-text-secondary">No clients found matching your criteria</p>
        </Card>
      )}
    </div>
  );
}
