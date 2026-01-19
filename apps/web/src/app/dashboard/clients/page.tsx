'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
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
import { trpc } from '@/lib/trpc';

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'inactive' | 'terminated'>('all');

  const { data, isLoading, error, refetch } = trpc.coachDashboard.getClientList.useQuery({
    status: filterStatus,
    search: searchQuery,
    limit: 20,
    offset: 0,
  });

  const clients = data?.clients || [];
  const totalCount = data?.totalCount || 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'pending' | 'inactive' | 'terminated')}
              className="px-4 py-2 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && <LoadingSkeleton variant="card" count={3} />}

      {/* Error State */}
      {error && <ErrorMessage error={error} retry={() => refetch()} />}

      {/* Clients List */}
      {!isLoading && !error && (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.clientId} variant="elevated" padding="none">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center font-semibold">
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active'
                            ? 'bg-accent-green/10 text-accent-green'
                            : client.status === 'pending'
                            ? 'bg-accent-orange/10 text-accent-orange'
                            : client.status === 'inactive'
                            ? 'bg-accent-yellow/10 text-accent-yellow'
                            : 'bg-accent-red/10 text-accent-red'
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>
                    <p className="text-text-secondary">{client.experienceLevel || 'No experience level set'}</p>
                  </div>
                  <button aria-label="More actions" className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-text-tertiary" />
                    <span className="text-text-secondary truncate">{client.clientId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-text-tertiary" />
                    <span className="text-text-secondary">Started {formatDate(client.assignedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-text-tertiary" />
                    <span className="text-text-secondary">Tier: {client.tier || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">
                      {client.acceptedAt ? `Accepted ${formatDate(client.acceptedAt)}` : 'Not accepted yet'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/dashboard/clients/${client.clientId}`}>
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
      )}

      {!isLoading && !error && clients.length === 0 && (
        <Card variant="bordered" padding="lg" className="text-center">
          <p className="text-text-secondary">No clients found matching your criteria</p>
        </Card>
      )}
    </div>
  );
}
