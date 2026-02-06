'use client';

import { useState, useEffect } from 'react';
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
  AlertCircle,
  Loader,
  CheckCircle,
  Info,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/providers/ThemeProvider';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const utils = trpc.useUtils();
  const { theme, setTheme } = useTheme();

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const { data: userData, isLoading: isUserLoading, error: userError } = trpc.auth.me.useQuery();
  const { data: notificationPrefs, isLoading: isLoadingPrefs } = trpc.coachDashboard.getNotificationPreferences.useQuery();

  const updateProfileMutation = trpc.coachDashboard.updateProfile.useMutation({
    onMutate: async (updatedProfile) => {
      setIsSaving(true);
      await utils.auth.me.cancel();
      const previousProfile = utils.auth.me.getData();
      utils.auth.me.setData(undefined, (old: any) => {
        if (!old || !old.profile) return old;
        return {
          ...old,
          profile: {
            ...old.profile,
            ...updatedProfile,
          },
        };
      });
      return { previousProfile };
    },
    onSuccess: () => {
      setIsSaving(false);
      setSaveSuccess(true);
      showToast('Profile saved', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: any, updatedProfile: any, context: any) => {
      setIsSaving(false);
      if (context?.previousProfile) {
        utils.auth.me.setData(undefined, context.previousProfile);
      }
      showToast('Failed to save profile', 'error');
      setSaveSuccess(false);
    },
    onSettled: () => {
      utils.auth.me.invalidate();
    },
  });

  const updateNotificationsMutation = trpc.coachDashboard.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      showToast('Notification preferences saved', 'success');
      utils.coachDashboard.getNotificationPreferences.invalidate();
    },
    onError: () => {
      showToast('Failed to save preferences', 'error');
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      showToast('Password changed successfully', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    },
    onError: (error) => {
      showToast(error.message || 'Failed to change password', 'error');
    },
  });

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    website: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyDigest: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  // Update state when data loads
  useEffect(() => {
    if (userData?.profile) {
      setProfile({
        name: userData.profile.name || '',
        phone: '',
        website: '',
      });
    }
  }, [userData]);

  useEffect(() => {
    if (notificationPrefs) {
      setNotifications({
        emailNotifications: notificationPrefs.emailNotifications,
        pushNotifications: notificationPrefs.pushNotifications,
        smsNotifications: notificationPrefs.smsNotifications,
        weeklyDigest: notificationPrefs.weeklyDigest,
      });
    }
  }, [notificationPrefs]);

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        name: profile.name,
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleSaveNotifications = async () => {
    await updateNotificationsMutation.mutateAsync(notifications);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    await changePasswordMutation.mutateAsync({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  if (userError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-text-secondary">Manage your account and preferences</p>
        </div>
        <Card variant="bordered" padding="lg" className="border-accent-red/20 bg-accent-red/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-accent-red">Failed to load settings</h3>
              <p className="text-sm text-text-secondary mt-1">
                {userError.message || 'Unable to fetch your profile. Please try again later.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const currentUser = userData?.user;
  const currentProfile = userData?.profile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
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

        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
              {isUserLoading ? (
                <div className="space-y-4">
                  <div className="h-8 bg-background-tertiary rounded w-32 mb-6" />
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-background-tertiary rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-accent-blue flex items-center justify-center text-white text-2xl font-bold">
                      {currentProfile?.name?.split(' ').slice(0, 2).map(n => n[0]).join('') || 'U'}
                    </div>
                    <div>
                      <Button variant="outline" size="sm" onClick={() => showToast('Photo upload coming soon', 'info')}>
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
                      disabled={updateProfileMutation.isPending}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      disabled={updateProfileMutation.isPending}
                    />
                    <Input
                      label="Website"
                      type="url"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      disabled={updateProfileMutation.isPending}
                    />
                  </div>

                  {updateProfileMutation.error && (
                    <div className="p-4 bg-accent-red/5 border border-accent-red/20 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-accent-red">Failed to save changes. Please try again.</p>
                    </div>
                  )}

                  {saveSuccess && (
                    <div className="p-4 bg-accent-green/5 border border-accent-green/20 rounded-xl flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-accent-green">Profile updated successfully!</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending || isSaving}>
                      {isSaving ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Saved ✓
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>

              {isLoadingPrefs ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-6 bg-background-tertiary rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="w-5 h-5 text-text-secondary" />
                      <h3 className="font-medium">Email Notifications</h3>
                    </div>
                    <div className="space-y-3 ml-7">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-text-secondary">All email notifications</span>
                        <input
                          type="checkbox"
                          checked={notifications.emailNotifications}
                          onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                          className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-text-secondary">Weekly summary reports</span>
                        <input
                          type="checkbox"
                          checked={notifications.weeklyDigest}
                          onChange={(e) => setNotifications({ ...notifications, weeklyDigest: e.target.checked })}
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
                        <span className="text-text-secondary">Push notifications</span>
                        <input
                          type="checkbox"
                          checked={notifications.pushNotifications}
                          onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                          className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-text-secondary">SMS notifications</span>
                        <input
                          type="checkbox"
                          checked={notifications.smsNotifications}
                          onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
                          className="w-5 h-5 rounded text-accent-blue focus:ring-accent-blue"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotifications} disabled={updateNotificationsMutation.isPending}>
                      {updateNotificationsMutation.isPending ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Preferences
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'security' && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold mb-6">Security Settings</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Change Password</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                    />
                    <div className="text-xs text-text-secondary ml-1">
                      Must be 8+ characters with uppercase, lowercase, number, and special character
                    </div>
                    <Input
                      label="Confirm New Password"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmNewPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                      required
                    />
                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </form>
                </div>

                <hr className="border-background-tertiary" />

                <div>
                  <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
                  <p className="text-text-secondary mb-4">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                  <Button variant="outline" onClick={() => showToast('Two-factor authentication coming soon', 'info')}>Enable 2FA</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'billing' && (
            <Card variant="default" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Billing & Subscription</h2>
                <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange rounded-full text-sm font-medium">
                  Coming Soon
                </span>
              </div>

              <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-xl mb-6 flex items-start gap-3">
                <Info className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary">
                  Contact <strong className="text-accent-blue">support@voicefit.com</strong> to manage billing
                </p>
              </div>

              <div className="py-12 text-center text-text-secondary">
                <p className="text-lg font-medium mb-2">Billing management is not yet available.</p>
                <p className="text-sm">Plan details, payment methods, and invoices will appear here once billing is integrated.</p>
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
                    {(['light', 'dark', 'system'] as const).map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => setTheme(themeOption)}
                        className={`p-4 rounded-xl border-2 transition-colors ${
                          theme === themeOption
                            ? 'border-accent-blue bg-accent-blue/5'
                            : 'border-background-tertiary hover:border-text-tertiary'
                        }`}
                      >
                        <div className={`w-full h-16 rounded-lg mb-3 ${
                          themeOption === 'dark' ? 'bg-gray-900' : 'bg-white border border-background-tertiary'
                        }`} />
                        <p className="font-medium capitalize">{themeOption}</p>
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
                      <select
                        className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        onChange={() => showToast('Language preferences saved', 'success')}
                      >
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
                      <select
                        className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        onChange={() => showToast('Timezone preferences saved', 'success')}
                      >
                        <option>Pacific Time (PT)</option>
                        <option>Eastern Time (ET)</option>
                        <option>Central Time (CT)</option>
                        <option>UTC</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
