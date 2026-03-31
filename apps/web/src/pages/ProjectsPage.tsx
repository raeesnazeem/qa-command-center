import React, { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CanDo } from '../components/CanDo';
import { Plus, FolderPlus, RefreshCcw, AlertCircle } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: projects, isLoading, isError, error, refetch } = useProjects();

  console.log('--- ProjectsPage Render ---', { 
    isModalOpen, 
    projectsCount: projects?.length, 
    isLoading, 
    isError 
  });

  useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      console.log('--- Window Click Detected ---', {
        target: e.target,
        isModalOpen
      });
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [isModalOpen]);

  useEffect(() => {
    // @ts-ignore - Expose to window for manual testing from console
    window.openProjectModal = () => {
      console.log('--- GLOBAL TRIGGER: openProjectModal ---');
      setIsModalOpen(true);
    };
    return () => {
      // @ts-ignore
      delete window.openProjectModal;
    };
  }, []);

  const handleOpenModal = () => {
    console.log('--- ACTION: handleOpenModal triggered ---');
    alert('Opening Modal! Check console for state.'); // Visual confirmation
    setIsModalOpen(true);
  };

  const SkeletonCard = () => (
    <div className="bg-navy/50 border border-white/5 rounded-xl p-6 h-48 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-6 w-32 bg-white/10 rounded" />
        <div className="h-5 w-16 bg-white/10 rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-48 bg-white/5 rounded" />
        <div className="h-4 w-40 bg-white/5 rounded" />
      </div>
      <div className="mt-auto pt-6 flex gap-4">
        <div className="h-8 w-full bg-white/5 rounded" />
        <div className="h-8 w-full bg-white/5 rounded" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 lg:p-10 relative">
      {/* ABSOLUTE TEST TRIGGER */}
      <button 
        onClick={() => {
          console.log('--- ABSOLUTE TOP CLICK ---');
          setIsModalOpen(true);
        }}
        className="fixed top-2 left-2 z-[99999] bg-red-600 text-white p-2 text-[10px] rounded shadow-2xl font-bold border-2 border-white"
      >
        FORCE OPEN MODAL
      </button>

      {/* DEBUG BANNER */}
      <div className="bg-orange/20 border border-orange/50 p-2 text-orange text-center text-xs font-mono mb-4 rounded-lg">
        DEBUG MODE: Code Version 1.4 (Build: {new Date().toLocaleTimeString()}) | Modal State: {isModalOpen ? 'OPEN' : 'CLOSED'}
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-gray-400 mt-1">Manage and monitor your QA test environments</p>
        </div>
        
        <CanDo role="sub_admin">
          <button
            type="button"
            onClick={() => {
              console.log('--- CLICK: New Project Header Button ---');
              handleOpenModal();
            }}
            className="flex items-center justify-center space-x-2 bg-orange hover:bg-orange/90 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5 pointer-events-none" />
            <span className="pointer-events-none">New Project</span>
          </button>
        </CanDo>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="p-3 bg-red-500/20 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Failed to load projects</h3>
            <p className="text-gray-400 mb-6">
              {(error as any)?.response?.data?.error || 'An unexpected error occurred while fetching your projects.'}
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl font-semibold transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && projects?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-0">
            {/* DEBUG: Removed CanDo temporarily to verify clickability */}
            <button
              type="button"
              onClick={() => {
                console.log('--- CRITICAL: FolderPlus Icon CLICKED! ---');
                handleOpenModal();
              }}
              className="w-24 h-24 bg-navy rounded-3xl flex items-center justify-center mb-6 border-2 border-dashed border-orange/30 hover:border-orange shadow-xl cursor-pointer hover:bg-navy/80 transition-all group relative z-50 appearance-none outline-none scale-100 active:scale-95"
              style={{ pointerEvents: 'auto' }}
            >
              <FolderPlus className="w-12 h-12 text-gray-500 group-hover:text-orange transition-colors pointer-events-none" />
            </button>
            
            <h3 className="text-2xl font-bold text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 max-w-sm mb-8">
              Get started by creating your first project to monitor and run QA checks.
            </p>
            
            <button
              type="button"
              onClick={() => {
                console.log('--- CRITICAL: Create First Project Button CLICKED! ---');
                handleOpenModal();
              }}
              className="bg-orange hover:bg-orange/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange/20 active:scale-95 cursor-pointer relative z-50"
            >
              Create Your First Project
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && !isError && projects && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

