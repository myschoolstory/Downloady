import type { Context } from "https://edge.netlify.com";

interface DownloadRequest {
  url: string;
  action: 'info' | 'download';
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const getFileInfo = async (url: string): Promise<FileInfo> => {
  const response = await fetch(url, { method: 'HEAD' });
  
  if (!response.ok) {
    throw new Error(`Failed to access file: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const contentDisposition = response.headers.get('content-disposition');
  
  // Extract filename from URL or Content-Disposition header
  let filename = '';
  if (contentDisposition && contentDisposition.includes('filename=')) {
    const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (matches && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }
  
  if (!filename) {
    const urlPath = new URL(url).pathname;
    filename = urlPath.split('/').pop() || 'downloaded-file';
    
    // Add extension based on content type if missing
    if (!filename.includes('.')) {
      const extension = getExtensionFromMimeType(contentType);
      if (extension) {
        filename += extension;
      }
    }
  }

  return {
    name: filename,
    size: contentLength ? parseInt(contentLength, 10) : 0,
    type: contentType,
    url
  };
};

const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/json': '.json',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'video/mp4': '.mp4',
    'video/webm': '.webm'
  };
  
  return mimeToExt[mimeType] || '';
};

export default async (request: Request, context: Context) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { url, action }: DownloadRequest = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'info') {
      const fileInfo = await getFileInfo(url);
      return new Response(JSON.stringify(fileInfo), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'download') {
      const fileInfo = await getFileInfo(url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Stream the file back to the client
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': fileInfo.type,
          'Content-Disposition': `attachment; filename="${fileInfo.name}"`,
          'Content-Length': fileInfo.size.toString(),
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

export const config = { path: "/api/download" };