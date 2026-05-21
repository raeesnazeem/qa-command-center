import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  LogOut
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, SignOutButton } from '@clerk/react';
import { useRole } from '../hooks/useRole';
import { useAuthAxios } from '../lib/useAuthAxios';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const { user } = useUser();
  const { role } = useRole();
  const axios = useAuthAxios();
  const [googleChatUserId, setGoogleChatUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get('/api/users/notification-prefs');
        if (data && data.google_chat_user_id !== undefined) {
          setGoogleChatUserId(data.google_chat_user_id || '');
        }
      } catch (error) {
        console.error('Failed to fetch profile settings:', error);
      }
    };
    fetchProfile();
  }, [axios]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await axios.patch('/api/users/notification-prefs', {
        google_chat_user_id: googleChatUserId
      });
      toast.success('Profile settings updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your personal information and account security.',
      icon: User,
      items: [
        { label: 'Full Name', value: user?.fullName || 'Not set', type: 'text' },
        { label: 'Email Address', value: user?.primaryEmailAddress?.emailAddress || 'Not set', type: 'text' },
        { label: 'Role', value: role || 'developer', type: 'badge' },
        { label: 'Google Chat ID', value: googleChatUserId, type: 'input', placeholder: 'Enter your Google internal ID' },
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure how you receive updates and alerts.',
      icon: Bell,
      items: [
        { label: 'Email Alerts', value: true, type: 'toggle' },
        { label: 'Browser Notifications', value: false, type: 'toggle' },
        { label: 'System Updates', value: 'Enabled', type: 'status' },
      ]
    },
    {
      id: 'workspace',
      title: 'Workspace',
      description: 'Global settings for your QACC workspace.',
      icon: Globe,
      items: [
        { label: 'Workspace Name', value: 'QA Command Center', type: 'text' },
        { label: 'Organization ID', value: user?.publicMetadata?.orgId || 'Default', type: 'text' },
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and workspace preferences</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center space-x-3 bg-slate-50/50">
              <div className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400">
                <section.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{section.title}</h3>
                <p className="text-xs text-slate-500 font-medium">{section.description}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-2">
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-widest text-[10px]">{item.label}</span>
                  <div className="flex items-center space-x-4">
                    {item.type === 'text' && (
                      <span className="text-sm font-semibold text-slate-900">{item.value as string}</span>
                    )}
                    {item.type === 'input' && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={googleChatUserId}
                          onChange={(e) => setGoogleChatUserId(e.target.value)}
                          placeholder={item.placeholder}
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-accent w-48"
                        />
                        <button 
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="btn-unified-secondary h-8 px-3 text-[10px] flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save
                        </button>
                      </div>
                    )}
                    {item.type === 'badge' && (
                      <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded-full border border-accent/20">
                        {item.value as string}
                      </span>
                    )}
                    {item.type === 'toggle' && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={item.value as boolean} className="sr-only peer" readOnly />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    )}
                    {item.type === 'status' && (
                      <div className="flex items-center space-x-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-semibold text-slate-900">{item.value as string}</span>
                      </div>
                    )}
            <button className="btn-unified-secondary h-6 text-[10px]">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Dangerous Zone */}
        <section className="bg-red-50/30 border border-red-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-red-50 flex items-center space-x-3 bg-red-50/50">
            <div className="p-2 bg-white border border-red-100 rounded-lg text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-red-900">Danger Zone</h3>
              <p className="text-xs text-red-600/70 font-medium">Irreversible actions for your account and data.</p>
            </div>
          </div>
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Delete Account</h4>
              <p className="text-xs text-slate-500">Permanently remove your account and all associated data.</p>
            </div>
            <button className="btn-unified-danger">
              Delete Account
            </button>
          </div>
          <div className="px-6 py-4 bg-red-50/50 border-t border-red-50 flex justify-end">
            <SignOutButton>
              <button className="btn-unified-danger flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </SignOutButton>
          </div>
        </section>
      </div>
    </div>
  );
};
