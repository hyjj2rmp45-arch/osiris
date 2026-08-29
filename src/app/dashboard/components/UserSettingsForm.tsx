'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';

export const UserSettingsForm = () => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    theme: 'dark',
    notifications: {
      email: true,
      push: true,
      tradeConfirmation: true,
      priceAlerts: false,
    },
    language: 'en',
    timezone: 'UTC',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.') as [keyof typeof formData, string];
        const parentValue = prev[parent];
        if (typeof parentValue === 'object' && parentValue !== null) {
          return {
            ...prev,
            [parent]: { ...parentValue, [child]: value },
          };
        }
        return prev;
      }
      return { ...prev, [field]: value };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In real app, call API to save settings
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Saving settings:', formData);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 bg-surface-elevated border border-border rounded-sm">
      <h2 className="text-lg font-semibold mb-6">User Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Appearance</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select
                value={formData.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Notifications</h3>
          <div className="space-y-3">
            {Object.entries(formData.notifications).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) => handleChange(`notifications.${key}`, e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                />
                <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-surface rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};