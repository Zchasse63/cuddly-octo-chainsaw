'use client';

import { Card } from '@/components/ui/Card';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  Loader,
  BarChart3,
  Award,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/Button';

export default function AnalyticsPage() {
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = trpc.coachDashboard.getAnalyticsSummary.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
  const { data: weeklyData, isLoading: weeklyLoading, error: weeklyError } = trpc.coachDashboard.getWeeklyActivity.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const { data: topPrograms, isLoading: programsLoading, error: programsError } = trpc.coachDashboard.getTopPrograms.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const { data: clientRetention, isLoading: retentionLoading, error: retentionError } = trpc.coachDashboard.getClientRetention.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const { data: aiInsights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = trpc.coachDashboard.getAIAnalyticsInsights.useQuery({ forceRefresh: false });

  // Build metrics from API data
  const metrics = [
    {
      name: 'Active Clients',
      value: analyticsData?.totalClients ?? '-',
      change: '+8.2%',
      trend: 'up',
      period: 'vs last month',
      icon: Users,
      color: 'text-accent-blue',
    },
    {
      name: 'Average Adherence',
      value: `${analyticsData?.averageAdherence ?? '-'}%`,
      change: '+2.1%',
      trend: 'up',
      period: 'vs last month',
      icon: TrendingUp,
      color: 'text-accent-green',
    },
    {
      name: 'At Risk Clients',
      value: analyticsData?.atRiskClients?.length ?? '0',
      change: '-1.0%',
      trend: 'down',
      period: 'vs last month',
      icon: Activity,
      color: 'text-accent-purple',
    },
    {
      name: 'Total Revenue',
      value: '$45,231',
      change: '+12.5%',
      trend: 'up',
      period: 'vs last month',
      icon: DollarSign,
      color: 'text-accent-green',
    },
  ];

  // Error state
  if (analyticsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-text-secondary">Track your coaching business performance</p>
        </div>
        <Card variant="bordered" padding="lg" className="border-accent-red/20 bg-accent-red/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-accent-red">Failed to load analytics</h3>
              <p className="text-sm text-text-secondary mt-1">
                {analyticsError.message || 'Unable to fetch your analytics data. Please try again later.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-text-secondary">Track your coaching business performance</p>
      </div>

      {/* Key Metrics */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="elevated" padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-background-tertiary rounded w-20 mb-3" />
                  <div className="h-8 bg-background-tertiary rounded w-16 mb-3" />
                  <div className="h-4 bg-background-tertiary rounded w-24" />
                </div>
                <div className="w-12 h-12 bg-background-secondary rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
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
      )}

      {/* AI Insights */}
      <Card variant="default" padding="none">
        <div className="p-6 border-b border-background-tertiary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-purple" />
            <h2 className="text-lg font-semibold">AI Insights</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchInsights()}
            disabled={insightsLoading}
            aria-label="Refresh AI insights"
          >
            {insightsLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="p-6">
          {insightsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader className="w-6 h-6 animate-spin text-text-secondary" />
            </div>
          ) : insightsError ? (
            <Card variant="bordered" padding="md" className="border-accent-red/20 bg-accent-red/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-accent-red">AI insights unavailable</p>
              </div>
            </Card>
          ) : aiInsights && aiInsights.insights.length > 0 ? (
            <div className="space-y-3">
              {(aiInsights.insights as Array<{ id: string; title: string; description: string; priority: 'high' | 'medium' | 'low'; clientIds: string[] }>).map((insight) => {
                const priorityColors: Record<'high' | 'medium' | 'low', string> = {
                  high: 'border-accent-red/30 bg-accent-red/5 text-accent-red',
                  medium: 'border-accent-orange/30 bg-accent-orange/5 text-accent-orange',
                  low: 'border-accent-blue/30 bg-accent-blue/5 text-accent-blue',
                };
                return (
                  <Card key={insight.id} variant="bordered" padding="md" className={priorityColors[insight.priority]}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{insight.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[insight.priority]}`}>
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary">{insight.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <div className="text-xs text-text-tertiary mt-4">
                Last analyzed: {new Date(aiInsights.cachedAt).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center">Not enough data for AI analysis</p>
          )}
        </div>
      </Card>

      {/* Weekly Activity Chart */}
      <Card variant="default" padding="none">
        <div className="p-6 border-b border-background-tertiary">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-blue" />
            <h2 className="text-lg font-semibold">Weekly Activity</h2>
          </div>
          <p className="text-sm text-text-secondary mt-1">Completed workouts by day</p>
        </div>
        <div className="p-6">
          {weeklyLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader className="w-6 h-6 animate-spin text-text-secondary" />
            </div>
          ) : weeklyError ? (
            <Card variant="bordered" padding="md" className="border-accent-red/20 bg-accent-red/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-accent-red">Failed to load weekly activity data</p>
              </div>
            </Card>
          ) : weeklyData ? (
            <div className="flex items-end justify-between gap-4 h-48">
              {weeklyData.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full bg-background-tertiary rounded-t-lg" style={{ height: `${Math.max((day.count / Math.max(...weeklyData.map(d => d.count), 1)) * 100, 5)}%` }}>
                    <div className="absolute inset-0 bg-accent-blue rounded-t-lg" />
                  </div>
                  <p className="text-xs font-medium">{day.count}</p>
                  <p className="text-xs text-text-tertiary">{day.day}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Top Programs */}
      <Card variant="default" padding="none">
        <div className="p-6 border-b border-background-tertiary">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-accent-purple" />
            <h2 className="text-lg font-semibold">Top Programs</h2>
          </div>
          <p className="text-sm text-text-secondary mt-1">Most popular training programs</p>
        </div>
        {programsLoading ? (
          <div className="p-6 flex items-center justify-center">
            <Loader className="w-6 h-6 animate-spin text-text-secondary" />
          </div>
        ) : programsError ? (
          <div className="p-6">
            <Card variant="bordered" padding="md" className="border-accent-red/20 bg-accent-red/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-accent-red">Failed to load top programs data</p>
              </div>
            </Card>
          </div>
        ) : topPrograms && topPrograms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-background-tertiary">
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Program</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Active Clients</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Avg Adherence</th>
                </tr>
              </thead>
              <tbody>
                {topPrograms.map((program) => (
                  <tr key={program.name} className="border-b border-background-secondary hover:bg-background-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{program.name}</td>
                    <td className="px-6 py-4">{program.activeClients}</td>
                    <td className="px-6 py-4">
                      <span className="text-accent-green font-medium">{program.averageAdherence}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-text-secondary">
            <p className="text-sm">No programs found</p>
          </div>
        )}
      </Card>

      {/* Client Retention */}
      <Card variant="default" padding="none">
        <div className="p-6 border-b border-background-tertiary">
          <h2 className="text-lg font-semibold">Client Retention</h2>
          <p className="text-sm text-text-secondary mt-1">Monthly client retention and churn</p>
        </div>
        <div className="p-6">
          {retentionLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader className="w-6 h-6 animate-spin text-text-secondary" />
            </div>
          ) : retentionError ? (
            <Card variant="bordered" padding="md" className="border-accent-red/20 bg-accent-red/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-accent-red">Failed to load retention data</p>
              </div>
            </Card>
          ) : clientRetention ? (
            <div className="flex items-end justify-between gap-4 h-48">
              {clientRetention.map((month) => (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full space-y-1">
                    <div
                      className="w-full bg-accent-green rounded-t-lg"
                      style={{ height: `${Math.max((month.retained / Math.max(...clientRetention.map(m => m.retained + m.churned), 1)) * 100, 5)}px` }}
                    />
                    {month.churned > 0 && (
                      <div
                        className="w-full bg-accent-red"
                        style={{ height: `${Math.max((month.churned / Math.max(...clientRetention.map(m => m.retained + m.churned), 1)) * 100, 5)}px` }}
                      />
                    )}
                  </div>
                  <p className="text-xs font-medium">{month.retained}/{month.churned}</p>
                  <p className="text-xs text-text-tertiary">{month.month}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      {/* At Risk Clients Table */}
      {analyticsData && analyticsData.atRiskClients.length > 0 && (
        <Card variant="default" padding="none">
          <div className="p-6 border-b border-background-tertiary">
            <h2 className="text-lg font-semibold">At Risk Clients</h2>
            <p className="text-sm text-text-secondary mt-1">Clients with adherence below 50%</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-background-tertiary">
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Client</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Adherence</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.atRiskClients.map((client) => (
                  <tr key={client.clientId} className="border-b border-background-secondary hover:bg-background-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{client.name}</td>
                    <td className="px-6 py-4 text-accent-red font-medium">{Math.round(client.adherence)}%</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-accent-red/10 text-accent-red">
                        At Risk
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
