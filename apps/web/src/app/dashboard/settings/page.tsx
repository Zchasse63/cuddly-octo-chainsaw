'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Palette,
  Globe,
  Mail,
  Smartphone,
  Save,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    bio: 'Certified personal trainer with 10+ years of experience. Specializing in strength training and body composition.',
    website: 'https://johndoe.fitness',
  });

  const [notifications, setNotifications] = useState({
    emailWorkouts: true,
    emailMessages: true,
    emailWeekly: true,
    pushWorkouts: true,
    pushMessages: true,
    pushReminders: false,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Navigation */}
        <Card variant="bordered" padding="sm" className="lg:w-64 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-accent-blue flex items-center justify-center text-white text-2xl font-bold">
                    JD
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Change Photo
                    </Button>
                    <p className="text-sm text-text-secondary mt-2">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                  <Input
                    label="Website"
                    type="url"
                    value={profile.website}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-5 h-5 text-text-secondary" />
                    <h3 className="font-medium">Email Notifications</h3>
                  </div>
                  <div className="space-y-3 ml-7">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-text-secondary">Client workout completions</span>
                      <input
                        type="checkbox"
                        checked={notifications.emailWorkouts}
                        onChange={(e) => setNotifications({ ...notifications, emailWorkouts: e.target.checked })}
                        className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-text-secondary">New messages</span>
                      <input
                        type="checkbox"
                        checked={notifications.emailMessages}
                        onChange={(e) => setNotifications({ ...notifications, emailMessages: e.target.checked })}
                        className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-text-secondary">Weekly summary reports</span>
                      <input
                        type="checkbox"
                        checked={notifications.emailWeekly}
                        onChange={(e) => setNotifications({ ...notifications, emailWeekly: e.target.checked })}
                        className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                      />
                    </label>
                  </div>
                </div>

                <hr className="border-background-tertiary" />

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="w-5 h-5 text-text-secondary" />
                    <h3 className="font-medium">Push Notifications</h3>
                  </div>
                  <div className="space-y-3 ml-7">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-text-secondary">Client workout updates</span>
                      <input
                        type="checkbox"
                        checked={notifications.pushWorkouts}
                        onChange={(e) => setNotifications({ ...notifications, pushWorkouts: e.target.checked })}
                        className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-text-secondary">New messages</span>
                      <input
                        type="checkbox"
                        checked={notifications.pushMessages}
                        onChange={(e) => setNotifications({ ...notifications, pushMessages: e.target.checked })}
                        className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-text-secondary">Session reminders</span>
                      <input
                        type="checkbox"
                        checked={notifications.pushReminders}
                        onChange={(e) => setNotifications({ ...notifications, pushReminders: e.target.checked })}
                        className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Security Settings</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="Enter current password"
                    />
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Enter new password"
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      placeholder="Confirm new password"
                    />
                    <Button>Update Password</Button>
                  </div>
                </div>

                <hr className="border-background-tertiary" />

                <div>
                  <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
                  <p className="text-text-secondary mb-4">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>

                <hr className="border-background-tertiary" />

                <div>
                  <h3 className="font-medium mb-4">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-background-secondary rounded-xl">
                      <div>
                        <p className="font-medium">MacBook Pro - Chrome</p>
                        <p className="text-sm text-text-secondary">San Francisco, CA • Current session</p>
                      </div>
                      <span className="px-2 py-1 bg-accent-green/10 text-accent-green rounded text-sm">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background-secondary rounded-xl">
                      <div>
                        <p className="font-medium">iPhone 14 Pro - Safari</p>
                        <p className="text-sm text-text-secondary">San Francisco, CA • 2 hours ago</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-accent-red">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'billing' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Billing & Subscription</h2>

              <div className="space-y-6">
                <div className="p-6 bg-accent-blue/5 border border-accent-blue/20 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="px-3 py-1 bg-accent-blue text-white rounded-full text-sm font-medium">
                        Pro Plan
                      </span>
                      <p className="text-2xl font-bold mt-2">$49/month</p>
                    </div>
                    <Button variant="outline">Change Plan</Button>
                  </div>
                  <p className="text-text-secondary">
                    Your next billing date is <strong>December 15, 2024</strong>
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Payment Method</h3>
                  <div className="flex items-center justify-between p-4 bg-background-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                        VISA
                      </div>
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-text-secondary">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Update</Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Billing History</h3>
                  <div className="space-y-2">
                    {[
                      { date: 'Nov 15, 2024', amount: '$49.00', status: 'Paid' },
                      { date: 'Oct 15, 2024', amount: '$49.00', status: 'Paid' },
                      { date: 'Sep 15, 2024', amount: '$49.00', status: 'Paid' },
                    ].map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-background-secondary rounded-xl">
                        <div>
                          <p className="font-medium">{invoice.date}</p>
                          <p className="text-sm text-text-secondary">{invoice.amount}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-accent-green">{invoice.status}</span>
                          <Button variant="ghost" size="sm">Download</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Appearance</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['Light', 'Dark', 'System'].map((theme) => (
                      <button
                        key={theme}
                        className={`p-4 rounded-xl border-2 transition-colors ${
                          theme === 'Light'
                            ? 'border-accent-blue bg-accent-blue/5'
                            : 'border-background-tertiary hover:border-text-tertiary'
                        }`}
                      >
                        <div className={`w-full h-16 rounded-lg mb-3 ${
                          theme === 'Dark' ? 'bg-gray-900' : 'bg-white border border-background-tertiary'
                        }`} />
                        <p className="font-medium">{theme}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-background-tertiary" />

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-text-secondary" />
                    <h3 className="font-medium">Language & Region</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Language
                      </label>
                      <select className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        <option>English (US)</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Timezone
                      </label>
                      <select className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        <option>Pacific Time (PT)</option>
                        <option>Eastern Time (ET)</option>
                        <option>Central Time (CT)</option>
                        <option>UTC</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
