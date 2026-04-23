import axios from 'axios';

const pkg = require('../../package.json');

interface CreateBasecampTodoParams {
  token: string;
  accountId: string;
  projectId: string;
  todolistId: string;
  title: string;
  description: string;
  assigneeIds?: number[];
}

/**
 * Creates a to-do in Basecamp 3
 */
export async function createBasecampTodo(params: CreateBasecampTodoParams): Promise<{ id: number; url: string }> {
  const { token, accountId, projectId, todolistId, title, description, assigneeIds } = params;

  // Basecamp 3 recommends flat routes where possible. 
  // We use the todolists endpoint directly to reduce potential 404s from bucket hierarchy mismatches.
  const url = `https://3.basecampapi.com/${accountId}/todolists/${todolistId}/todos.json`;
  
  console.log(`[BasecampClient] Creating todo at URL: ${url}`);

  try {
    const response = await axios.post(
      url,
      {
        content: title,
        description: description,
        assignee_ids: assigneeIds || [],
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': `${pkg.name} (${process.env.SUPPORT_EMAIL || 'raees.nazeem@growth99.com'}) v${pkg.version}`,
        },
      }
    );

    return {
      id: response.data.id,
      url: response.data.app_url,
    };
  } catch (error: any) {
    if (error.response) {
      const detailedError = new Error(`Basecamp API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      (detailedError as any).status = error.response.status;
      (detailedError as any).data = error.response.data;
      throw detailedError;
    }
    throw error;
  }
}
