import { useState } from 'react';
import { ProjectWithMembers } from '../api/projects.api';
import { useUpdateProject } from '../hooks/useProjects';
import { useAuthAxios } from '../lib/useAuthAxios';
import { Settings, Globe, Layout, ShieldCheck, Database, Eye, EyeOff, Save, TestTube } from 'lucide-react';
import { CanDo } from './CanDo';
import toast from 'react-hot-toast';

interface SettingsTabProps {
  project: ProjectWithMembers;
}

export const SettingsTab = ({ project }: SettingsTabProps) => {
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject(project.id);
  const axios = useAuthAxios();
  
  const [formData, setFormData] = useState({
    name: project.name,
    site_url: project.site_url,
    client_name: project.client_name || '',
  });

  const [figmaToken, setFigmaToken] = useState('figma_secret_token_1234abcd');
  const [showFigma, setShowFigma] = useState(false);

  const [basecamp, setBasecamp] = useState({
    accountId: '1234567',
    projectId: '9876543',
    todoListId: '11223344',
    apiToken: 'bc_api_token_xyz_999',
  });
  const [showBasecamp, setShowBasecamp] = useState(false);

  const maskValue = (value: string, showLast = 0) => {
    if (!value) return '';
    if (showLast === 0) return '••••••••••••••••';
    const masked = '•'.repeat(Math.max(0, value.length - showLast));
    const lastChars = value.slice(-showLast);
    return masked + lastChars;
  };
  const [isTestingBasecamp, setIsTestingBasecamp] = useState(false);

  const handleUpdateBasic = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject(formData);
  };

  const handleTestBasecamp = async () => {
    setIsTestingBasecamp(true);
    try {
      await axios.post(`/api/projects/${project.id}/settings/test-basecamp`);
      toast.success('Basecamp connection successful');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Basecamp connection failed');
    } finally {
      setIsTestingBasecamp(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
      <CanDo role="admin">
        {/* Basic Settings */}
        <section className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-900">General Settings</h3>
          </div>
          <form onSubmit={handleUpdateBasic} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Client Name</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Site URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={formData.site_url}
                  onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center space-x-2 bg-black text-white px-6 py-2 rounded-md font-bold text-sm hover:bg-slate-800 transition-all shadow-sm active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Figma Integration */}
        <section className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center space-x-2">
            <Layout className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-900">Figma Integration</h3>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-slate-500 leading-relaxed">
              Connect Figma to automatically pull design specs and compare them during QA runs.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Personal Access Token</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={showFigma ? figmaToken : maskValue(figmaToken, 4)}
                    onChange={(e) => setFigmaToken(e.target.value)}
                    readOnly={!showFigma}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-md pl-10 pr-12 py-2 text-sm focus:outline-none focus:border-accent transition-all ${!showFigma ? 'cursor-not-allowed opacity-70' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFigma(!showFigma)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showFigma ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="flex items-center space-x-2 bg-black text-white px-6 py-2 rounded-md font-bold text-sm hover:bg-slate-800 transition-all shadow-sm active:scale-95">
                <Save className="w-4 h-4" />
                <span>Update Token</span>
              </button>
            </div>
          </div>
        </section>

        {/* Basecamp Integration */}
        <section className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center space-x-2">
            <Database className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-900">Basecamp Integration</h3>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-sm text-slate-500 leading-relaxed">
              Automatically sync QA issues to your Basecamp project's to-do list.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Account ID</label>
                <input
                  type="text"
                  value={showBasecamp ? basecamp.accountId : maskValue(basecamp.accountId)}
                  onChange={(e) => setBasecamp({ ...basecamp, accountId: e.target.value })}
                  readOnly={!showBasecamp}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all ${!showBasecamp ? 'cursor-not-allowed opacity-70' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Project ID</label>
                <input
                  type="text"
                  value={showBasecamp ? basecamp.projectId : maskValue(basecamp.projectId)}
                  onChange={(e) => setBasecamp({ ...basecamp, projectId: e.target.value })}
                  readOnly={!showBasecamp}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all ${!showBasecamp ? 'cursor-not-allowed opacity-70' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">To-Do List ID</label>
                <input
                  type="text"
                  value={showBasecamp ? basecamp.todoListId : maskValue(basecamp.todoListId)}
                  onChange={(e) => setBasecamp({ ...basecamp, todoListId: e.target.value })}
                  readOnly={!showBasecamp}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all ${!showBasecamp ? 'cursor-not-allowed opacity-70' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">API Token</label>
                <div className="relative">
                  <input
                    type="text"
                    value={showBasecamp ? basecamp.apiToken : maskValue(basecamp.apiToken)}
                    onChange={(e) => setBasecamp({ ...basecamp, apiToken: e.target.value })}
                    readOnly={!showBasecamp}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-md pr-12 py-2 text-sm focus:outline-none focus:border-accent transition-all ${!showBasecamp ? 'cursor-not-allowed opacity-70' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowBasecamp(!showBasecamp)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showBasecamp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <button
                type="button"
                onClick={handleTestBasecamp}
                disabled={isTestingBasecamp}
                className="flex items-center space-x-2 text-accent hover:text-accent/80 font-bold text-sm transition-all"
              >
                {isTestingBasecamp ? <Settings className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                <span>Test Connection</span>
              </button>
              <button className="flex items-center space-x-2 bg-black text-white px-6 py-2 rounded-md font-bold text-sm hover:bg-slate-800 transition-all shadow-sm active:scale-95">
                <Save className="w-4 h-4" />
                <span>Save Basecamp Settings</span>
              </button>
            </div>
          </div>
        </section>
      </CanDo>
    </div>
  );
};
