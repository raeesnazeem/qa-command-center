import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateProjectSchema, CreateProjectInput } from '@qacc/shared';
import { useCreateProject } from '../hooks/useProjects';
import { X, Loader2, Globe, Building, CheckCircle2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      console.log('--- MODAL MOUNTED/OPENED ---');
    }
    return () => {
      if (isOpen) console.log('--- MODAL UNMOUNTED/CLOSED ---');
    };
  }, [isOpen]);

  const { mutate: createProject, isPending } = useCreateProject();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      is_woocommerce: false,
    },
  });

  const onSubmit = (data: CreateProjectInput) => {
    createProject(data, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200">
      <div 
        className="absolute inset-0 bg-transparent" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-lg bg-navy border border-white/20 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 transition-all duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
          <h2 className="text-xl font-bold text-white">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Project Name <span className="text-orange">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('name')}
                  placeholder="e.g. My Awesome Shop"
                  className={`w-full bg-white/5 border ${
                    errors.name ? 'border-red-500/50' : 'border-white/10'
                  } rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange transition-all`}
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Site URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Site URL <span className="text-orange">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  {...register('site_url')}
                  placeholder="https://example.com"
                  className={`w-full bg-white/5 border ${
                    errors.site_url ? 'border-red-500/50' : 'border-white/10'
                  } rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange transition-all`}
                />
              </div>
              {errors.site_url && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.site_url.message}</p>
              )}
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Client Name <span className="text-gray-500 text-[10px] uppercase ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  {...register('client_name')}
                  placeholder="ACME Corp"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange transition-all"
                />
              </div>
            </div>

            {/* WooCommerce Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-orange" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">WooCommerce</h4>
                  <p className="text-xs text-gray-400">Enable e-commerce specific QA checks</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('is_woocommerce')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange"></div>
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 rounded-xl text-sm font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-[2] px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-orange hover:bg-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
