export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
}

export class FileDownloadError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'FileDownloadError';
  }
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production
  : 'http://localhost:3000'; // Use localhost in development

export const getFileInfo = async (url: string): Promise<FileInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        action: 'info'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new FileDownloadError(
        errorData.error || `Request failed: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    const fileInfo = await response.json();
    return fileInfo;
  } catch (error) {
    if (error instanceof FileDownloadError) {
      throw error;
    }
    throw new FileDownloadError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const downloadFile = async (
  fileInfo: FileInfo,
  onProgress?: (progress: DownloadProgress) => void
): Promise<Blob> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: fileInfo.url,
        action: 'download'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new FileDownloadError(
        errorData.error || `Download failed: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new FileDownloadError('Unable to read response body');
    }

    const contentLength = fileInfo.size || parseInt(response.headers.get('content-length') || '0', 10);
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (onProgress && contentLength > 0) {
        onProgress({
          loaded: receivedLength,
          total: contentLength,
          percentage: (receivedLength / contentLength) * 100
        });
      }
    }

    // Combine chunks into a single Uint8Array
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    return new Blob([allChunks], { type: response.headers.get('content-type') || fileInfo.type });
  } catch (error) {
    if (error instanceof FileDownloadError) {
      throw error;
    }
    throw new FileDownloadError(`Download error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};