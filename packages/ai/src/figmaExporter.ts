import 'dotenv/config';
import { SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

export interface FigmaFrame {
  frameId: string;
  frameName: string;
  imageUrl: string;
  pageUrl: string;
}

/**
 * Parses Figma URL to extract file key and optional node ID.
 */
function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split('/');
    const fileKeyIndex = pathParts.findIndex(part => part === 'design' || part === 'file') + 1;
    const fileKey = pathParts[fileKeyIndex];
    const nodeId = u.searchParams.get('node-id');
    
    if (!fileKey) throw new Error('Invalid Figma URL: file key not found');
    return { fileKey, nodeId };
  } catch (error) {
    throw new Error('Invalid Figma URL format');
  }
}

/**
 * Maps Figma frame names to site URLs.
 */
function mapFrameNameToUrl(name: string): string {
  const clean = name.toLowerCase().trim();
  if (clean === 'homepage' || clean === 'home' || clean === 'index') return '/';
  const slug = clean.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  return slug.startsWith('/') ? slug : `/${slug}`;
}

/**
 * exportFigmaFrames
 * Fetches frames from Figma, saves to Supabase Storage, and returns metadata.
 */
export async function exportFigmaFrames(
  figmaUrl: string, 
  figmaToken: string,
  supabase: SupabaseClient,
  runId: string
): Promise<FigmaFrame[]> {
  const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
  const headers = { 'X-Figma-Token': figmaToken };

  // 1. Cache check: Has this runId already been exported?
  const { data: existingFiles } = await supabase.storage.from('findings').list(`figma/${runId}`);
  if (existingFiles && existingFiles.length > 0) {
    console.log(`Using cached Figma exports for run ${runId}`);
    return existingFiles.map(file => {
      const frameId = file.name.replace('.png', '').replace(/_/g, ':');
      const { data: { publicUrl } } = supabase.storage.from('findings').getPublicUrl(`figma/${runId}/${file.name}`);
      return {
        frameId,
        frameName: 'Cached Frame',
        imageUrl: publicUrl,
        pageUrl: '' // Page mapping might need more state if purely cached
      };
    });
  }

  let nodeIds: string[] = [];
  const frameMetadata: Record<string, { name: string }> = {};

  if (nodeId) {
    nodeIds = [nodeId];
    frameMetadata[nodeId] = { name: 'Selected Frame' };
  } else {
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, { headers });
    if (!fileRes.ok) throw new Error(`Figma API error (files): ${fileRes.statusText}`);
    const fileData: any = await fileRes.json();
    
    fileData.document.children.forEach((page: any) => {
      if (page.type === 'CANVAS') {
        page.children.forEach((node: any) => {
          if (node.type === 'FRAME') {
            nodeIds.push(node.id);
            frameMetadata[node.id] = { name: node.name };
          }
        });
      }
    });
  }

  if (nodeIds.length === 0) return [];

  // Get image URLs from Figma
  const imageRes = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds.join(',')}&format=png&scale=2`,
    { headers }
  );
  if (!imageRes.ok) throw new Error(`Figma API error (images): ${imageRes.statusText}`);
  const imageData: any = await imageRes.json();
  const imageUrls = imageData.images || {};

  const results: FigmaFrame[] = [];

  // Download each PNG and save to Supabase Storage
  for (const id of nodeIds) {
    const remoteUrl = imageUrls[id];
    if (!remoteUrl) continue;

    const imgRes = await fetch(remoteUrl);
    if (!imgRes.ok) continue;
    const buffer = await imgRes.arrayBuffer();

    const storagePath = `figma/${runId}/${id.replace(/:/g, '_')}.png`;
    const { error: uploadError } = await supabase.storage
      .from('findings')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error(`Failed to upload frame ${id} to storage:`, uploadError);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage.from('findings').getPublicUrl(storagePath);

    results.push({
      frameId: id,
      frameName: frameMetadata[id]?.name || 'Unknown',
      imageUrl: publicUrl,
      pageUrl: mapFrameNameToUrl(frameMetadata[id]?.name || '')
    });
  }

  return results;
}
