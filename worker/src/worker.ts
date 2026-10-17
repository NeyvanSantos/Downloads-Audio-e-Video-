import { createDownload, getDownloadStatus, getVideoMetadata, getDownloadLink, cleanupExpiredDownloads } from './downloadService';
import { DownloadRequest } from './types';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');

    try {
      // Health check
      if (path === '/health') {
        return new Response(
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200 
          }
        );
      }

      // Get video metadata
      if (path === '/preview') {
        const videoUrl = url.searchParams.get('url');
        if (!videoUrl) {
          return new Response(JSON.stringify({ error: 'URL is required' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const metadata = await getVideoMetadata(videoUrl);
        return new Response(JSON.stringify(metadata), { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200 
        });
      }

      // Start download
      if (path === '/download') {
        const data = await request.json() as DownloadRequest;
        const clientId = request.headers.get('CF-Connecting-IP') || 'unknown';

        if (!data.url) {
          return new Response(JSON.stringify({ error: 'URL is required' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const result = await createDownload(data, clientId);
        return new Response(JSON.stringify(result), { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200 
        });
      }

      // Get download status
      if (path.startsWith('/status/')) {
        const taskId = path.split('/status/')[1];
        const status = await getDownloadStatus(taskId);

        if (!status) {
          return new Response(JSON.stringify({ error: 'Download not found' }), { 
            status: 404, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        return new Response(JSON.stringify(status), { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200 
        });
      }

      // Download file
      if (path.startsWith('/download/')) {
        const taskId = path.split('/download/')[1];
        const download = await getDownloadLink(taskId);

        if (!download) {
          return new Response(JSON.stringify({ error: 'Download not found or not ready' }), { 
            status: 404, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Serve file (simplified - in production use direct blob storage)
        return new Response(
          JSON.stringify({ 
            downloadUrl: `/api/download/${taskId}`,
            fileName: download.file_name 
          }), 
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200 
          }
        );
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
