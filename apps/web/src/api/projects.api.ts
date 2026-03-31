import { AxiosInstance } from 'axios';
import { CreateProjectInput, UpdateProjectInput } from '@qacc/shared';

export interface Project {
  id: string;
  name: string;
  site_url: string;
  client_name?: string;
  is_woocommerce: boolean;
  status: 'active' | 'archived' | 'paused';
  org_id: string;
  created_at: string;
  updated_at: string;
  open_issues_count: number;
  last_run_date: string | null;
}

export interface ProjectMember {
  role: 'admin' | 'sub_admin' | 'qa_engineer' | 'developer';
  user_id: string;
  users: {
    full_name: string;
    email: string;
    role: string;
  };
}

export interface ProjectWithMembers extends Project {
  project_members: ProjectMember[];
}

export const getProjects = async (axios: AxiosInstance): Promise<Project[]> => {
  const { data } = await axios.get<Project[]>('/api/projects');
  return data;
};

export const getProject = async (axios: AxiosInstance, id: string): Promise<ProjectWithMembers> => {
  const { data } = await axios.get<ProjectWithMembers>(`/api/projects/${id}`);
  return data;
};

export const createProject = async (axios: AxiosInstance, projectData: CreateProjectInput): Promise<Project> => {
  const { data } = await axios.post<Project>('/api/projects', projectData);
  return data;
};

export const updateProject = async (
  axios: AxiosInstance,
  id: string,
  projectData: UpdateProjectInput
): Promise<Project> => {
  const { data } = await axios.patch<Project>(`/api/projects/${id}`, projectData);
  return data;
};
