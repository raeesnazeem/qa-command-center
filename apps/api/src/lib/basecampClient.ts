import axios from 'axios';

interface CreateBasecampTodoParams {
  token: string;
  accountId: string;
  projectId: string;
  todolistId: string;
  title: string;
  description: string;
  assigneeId?: number;
}

/**
 * Creates a to-do in Basecamp 3
 */
export async function createBasecampTodo(params: CreateBasecampTodoParams): Promise<{ id: number; url: string }> {
  const { token, accountId, projectId, todolistId, title, description, assigneeId } = params;

  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todolists/${todolistId}/todos.json`;

  const response = await axios.post(
    url,
    {
      content: title,
      description: description,
      assignee_ids: assigneeId ? [assigneeId] : [],
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'QACC (your@email.com)',
      },
    }
  );

  return {
    id: response.data.id,
    url: response.data.app_url,
  };
}
