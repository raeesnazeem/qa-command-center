import { supabase } from '../lib/supabase';
import { upsertFindingEmbedding, upsertTaskEmbedding } from './embedSync';

/**
 * Create a new project.
 */
export async function createProject(args: any, orgId: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: args.name,
      site_url: args.site_url,
      client_name: args.client_name,
      is_pre_release: args.is_pre_release || false,
      org_id: orgId,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing project.
 */
export async function updateProject(args: any, orgId: string) {
  const { project_id, ...updates } = args;
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', project_id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add a member to a project.
 */
export async function addProjectMember(args: any) {
  const { project_id, user_id, role } = args;
  const { data, error } = await supabase
    .from('project_members')
    .upsert({ project_id, user_id, role }, { onConflict: 'project_id,user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a member from a project.
 */
export async function removeProjectMember(args: any) {
  const { project_id, user_id } = args;
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', project_id)
    .eq('user_id', user_id);

  if (error) throw error;
  return { success: true };
}

/**
 * Create a new task and sync to embeddings.
 */
export async function createTask(args: any, orgId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: args.project_id,
      title: args.title,
      description: args.description,
      severity: args.severity || 'medium',
      status: 'open',
      assigned_to: args.assigned_to,
      finding_id: args.finding_id
    })
    .select()
    .single();

  if (error) throw error;

  // Sync to embeddings (background)
  upsertTaskEmbedding({
    id: data.id,
    project_id: data.project_id,
    org_id: orgId,
    title: data.title,
    description: data.description,
    severity: data.severity,
    status: data.status
  }).catch(err => console.error('Failed to sync task embedding:', err));

  return data;
}

/**
 * Update a task and sync to embeddings.
 */
export async function updateTask(args: any, orgId: string) {
  const { task_id, project_id, ...updates } = args;
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', task_id)
    .eq('project_id', project_id)
    .select()
    .single();

  if (error) throw error;

  // Sync to embeddings
  upsertTaskEmbedding({
    id: data.id,
    project_id: data.project_id,
    org_id: orgId,
    title: data.title,
    description: data.description,
    severity: data.severity,
    status: data.status
  }).catch(err => console.error('Failed to sync task embedding:', err));

  return data;
}

/**
 * Delete a task.
 */
export async function deleteTask(args: any) {
  const { task_id, project_id } = args;
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', task_id)
    .eq('project_id', project_id);

  if (error) throw error;

  // Ideally delete from embeddings too
  await supabase.from('embeddings').delete().eq('source_type', 'task').eq('source_id', task_id);

  return { success: true };
}

/**
 * Delete multiple tasks.
 */
export async function deleteTasksBulk(args: { task_ids: string[], project_id: string }) {
  const { task_ids, project_id } = args;
  const { error } = await supabase
    .from('tasks')
    .delete()
    .in('id', task_ids)
    .eq('project_id', project_id);

  if (error) throw error;

  // Delete from embeddings
  await supabase.from('embeddings').delete().eq('source_type', 'task').in('source_id', task_ids);

  return { success: true, count: task_ids.length };
}

/**
 * Update a finding and sync to embeddings.
 */
export async function updateFinding(args: any, orgId: string) {
  const { finding_id, run_id, ...updates } = args;
  const { data, error } = await supabase
    .from('findings')
    .update(updates)
    .eq('id', finding_id)
    .eq('run_id', run_id)
    .select('*, qa_runs(project_id)')
    .single();

  if (error) throw error;

  const project_id = (data.qa_runs as any)?.project_id;

  // Sync to embeddings
  upsertFindingEmbedding({
    id: data.id,
    run_id: data.run_id,
    title: data.title,
    description: data.description,
    severity: data.severity,
    status: data.status,
    org_id: orgId,
    project_id
  }).catch(err => console.error('Failed to sync finding embedding:', err));

  return data;
}

/**
 * Delete a finding.
 */
export async function deleteFinding(args: any) {
  const { finding_id, run_id } = args;
  const { error } = await supabase
    .from('findings')
    .delete()
    .eq('id', finding_id)
    .eq('run_id', run_id);

  if (error) throw error;

  // Delete from embeddings
  await supabase.from('embeddings').delete().eq('source_type', 'finding').eq('source_id', finding_id);

  return { success: true };
}

/**
 * Update user org role.
 */
export async function updateUserRole(args: any) {
  const { user_id, role } = args;
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', user_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new QA run.
 */
export async function createRun(args: any) {
  const { project_id, urls, device_matrix, start_immediately } = args;
  const { data, error } = await supabase
    .from('qa_runs')
    .insert({
      project_id,
      urls: urls || [],
      device_matrix: device_matrix || [],
      status: start_immediately ? 'pending' : 'paused'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel a QA run.
 */
export async function cancelRun(args: any) {
  const { run_id, project_id } = args;
  const { data, error } = await supabase
    .from('qa_runs')
    .update({ status: 'cancelled' })
    .eq('id', run_id)
    .eq('project_id', project_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
