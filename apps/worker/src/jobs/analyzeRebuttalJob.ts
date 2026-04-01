import { Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { analyzeRebuttal } from '@qacc/ai/src/rebuttalAnalyzer';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

async function downloadBuffer(url: string | null | undefined): Promise<Buffer | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    logger.warn({ url, error: error.message }, 'Failed to download image buffer');
    return undefined;
  }
}

export async function processAnalyzeRebuttalJob(job: Job) {
  const { rebuttalId, taskId } = job.data;

  if (!rebuttalId || !taskId) {
    throw new Error('Missing rebuttalId or taskId in job data');
  }

  logger.info({ rebuttalId, taskId }, 'Starting AI analyze rebuttal job');

  // Load rebuttal
  const { data: rebuttal, error: rebuttalError } = await supabase
    .from('task_rebuttals')
    .select('*')
    .eq('id', rebuttalId)
    .single();

  if (rebuttalError || !rebuttal) {
    throw new Error(`Failed to load rebuttal: ${rebuttalError?.message}`);
  }

  // Load task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error(`Failed to load task: ${taskError?.message}`);
  }

  // Load original finding to access description and original failure screenshot
  let findingDesc = task.description || '';
  let findingImageBuffer: Buffer | undefined;

  if (task.finding_id) {
    const { data: findingData } = await supabase
      .from('findings')
      .select('description, screenshot_url')
      .eq('id', task.finding_id)
      .single();
    
    if (findingData) {
      findingDesc = findingData.description || findingDesc;
      findingImageBuffer = await downloadBuffer(findingData.screenshot_url);
    }
  }

  if (!findingImageBuffer) {
    throw new Error('Original finding screenshot is missing, cannot perform visual AI evaluation');
  }

  const rebuttalImageBuffer = await downloadBuffer(rebuttal.screenshot_url);

  logger.info({ rebuttalId }, 'Calling AI rebuttal analyzer...');

  const verdictResult = await analyzeRebuttal({
    findingDescription: findingDesc,
    findingScreenshotBuffer: findingImageBuffer,
    rebuttalText: rebuttal.text || '',
    rebuttalScreenshotBuffer: rebuttalImageBuffer,
  });

  logger.info({ rebuttalId, verdictResult }, 'AI analysis completed');

  // Update rebuttal record with AI analysis details
  const { error: updateError } = await supabase
    .from('task_rebuttals')
    .update({
      ai_verdict: verdictResult.verdict,
      ai_confidence: verdictResult.confidence,
      ai_reasoning: verdictResult.reasoning
    })
    .eq('id', rebuttalId);
    
  if (updateError) {
    logger.error({ rebuttalId, error: updateError.message }, 'Failed to update rebuttal record with AI verdict');
  }

  // Add AI verdict as a comment (is_ai_generated=true)
  const commentContent = `**AI Analysis Complete:** The developer's rebuttal has been evaluated as **${verdictResult.verdict.toUpperCase()}**.

*Confidence:* ${verdictResult.confidence}%
*Reasoning:* ${verdictResult.reasoning}`;

  const { data: aiComment, error: commentError } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      content: commentContent,
      is_ai_generated: true
    })
    .select()
    .single();

  if (commentError) {
    logger.error({ error: commentError.message }, 'Failed to insert AI verdict comment into task thread');
  }

  // Broadcast update via Realtime to alert frontend subscribers
  const taskChannel = supabase.channel(`task:${taskId}`);
  await taskChannel.send({
    type: 'broadcast',
    event: 'rebuttal_analyzed',
    payload: {
      taskId,
      rebuttalId,
      verdictData: verdictResult,
      comment: aiComment
    }
  });

  logger.info({ rebuttalId }, 'Analyze rebuttal job completed successfully');
}
