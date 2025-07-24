import React, { useState } from 'react';
import { Download, CheckCircle, AlertCircle, Loader2, FileText, Image, Music, Video, Archive, File } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { 
  getFileInfo, 
  downloadFile, 
  saveBlob, 
  formatFileSize, 
  isValidUrl,
  FileInfo,
  DownloadProgress,
  FileDownloadError
} from '../utils/fileDownloader';

interface DownloadStage {
  name: string;
  progress: number;
  message: string;
  color: 'blue' | 'green' | 'amber' | 'red';
  completed: boolean;
}

const FileDownloader: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [canInstantDownload, setCanInstantDownload] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [downloadedBlob, setDownloadedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [scanForViruses, setScanForViruses] = useState(false);
  const [virusScanResult, setVirusScanResult] = useState<any>(null);
  const [stages, setStages] = useState<DownloadStage[]>([
    {
      name: 'access-check',
      progress: 0,
      message: 'Checking if you deserve this file...',
      color: 'blue',
      completed: false
    },
    {
      name: 'download',
      progress: 0,
      message: 'Downloading your file...',
      color: 'green',
      completed: false
    }
  ]);

  const funnyMessages = {
    'access-check': [
      'Bribing the server with cookies...',
      'Asking the file nicely to come out...',
      'Checking if you deserve this file...',
      'Doing a background check on the URL...',
      'Making sure the file is not a mirage...',
      'Negotiating with digital gatekeepers...',
      'Verifying your download worthiness...',
      'Consulting the internet elders...'
    ],
    'download': [
      'Herding digital cats into your file...',
      'Convincing bytes to jump through the internet...',
      'Collecting scattered data from the cloud...',
      'Teaching packets to form an orderly queue...',
      'Assembling your file like digital LEGO...',
      'Translating server language to human...',
      'Performing internet magic...',
      'Almost there, the file is cooperating!'
    ]
  };

  const updateStageProgress = (stageIndex: number, progress: number, message?: string) => {
    setStages(prev => prev.map((stage, index) => {
      if (index === stageIndex) {
        return {
          ...stage,
          progress,
          message: message || stage.message,
          completed: progress >= 100
        };
      }
      return stage;
    }));
  };

  const getRandomMessage = (stageType: keyof typeof funnyMessages) => {
    const messages = funnyMessages[stageType];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-5 h-5" />;
    if (mimeType.startsWith('text/')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const simulateAccessCheck = async (stageIndex: number) => {
    setCurrentStageIndex(stageIndex);
    
    // Simulate checking access with some realistic delays
    for (let progress = 0; progress <= 100; progress += Math.random() * 20 + 10) {
      const clampedProgress = Math.min(progress, 100);
      
      if (progress % 40 < 20 && progress > 0) {
        const newMessage = getRandomMessage('access-check');
        updateStageProgress(stageIndex, clampedProgress, newMessage);
      } else {
        updateStageProgress(stageIndex, clampedProgress);
      }
      
      const delay = Math.random() * 150 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) return;

    setIsProcessing(true);
    setCanInstantDownload(false);
    setFileInfo(null);
    setDownloadedBlob(null);
    setError(null);
    setVirusScanResult(null);
    setCurrentStageIndex(0);

    // Reset stages
    setStages([
      {
        name: 'access-check',
        progress: 0,
        message: 'Checking file access...',
        color: 'blue',
        completed: false
      },
      {
        name: 'download',
        progress: 0,
        message: 'Preparing download...',
        color: 'green',
        completed: false
      }
    ]);

    try {
      // Stage 1: Access check and get file info
      await simulateAccessCheck(0);
      const info = await getFileInfo(url);
      setFileInfo(info);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Actual download
      setCurrentStageIndex(1);
      updateStageProgress(1, 0, `Downloading ${info.name}...`);

      // --- Download via backend with virus scan option ---
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action: 'download', scanForViruses }),
      });

      if (res.status === 403) {
        const result = await res.json();
        setError(result.error || 'File flagged as malicious');
        setVirusScanResult(result.virusTotal || null);
        return;
      }
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setError(result.error || 'Download failed');
        return;
      }
      const blob = await res.blob();
      setDownloadedBlob(blob);
      setCanInstantDownload(true);
    } catch (error) {
      setError(error instanceof FileDownloadError ? error.message : 'An unexpected error occurred');
      setCanInstantDownload(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstantDownload = () => {
    if (!downloadedBlob || !fileInfo) return;
    saveBlob(downloadedBlob, fileInfo.name);
  };

  const resetDownloader = () => {
    setUrl('');
    setIsProcessing(false);
    setCanInstantDownload(false);
    setFileInfo(null);
    setDownloadedBlob(null);
    setError(null);
    setCurrentStageIndex(0);
    setStages([
      {
        name: 'access-check',
        progress: 0,
        message: 'Checking file access...',
        color: 'blue',
        completed: false
      },
      {
        name: 'download',
        progress: 0,
        message: 'Preparing download...',
        color: 'green',
        completed: false
      }
    ]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Download className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">File Downloader</h1>
          <p className="text-gray-600">Download any file from the internet with progress tracking</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              File URL
            </label>
            <div className="relative">
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/file.pdf"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={isProcessing}
              />
              {url && !isValidUrl(url) && (
                <div className="absolute right-3 top-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>
            {url && !isValidUrl(url) && (
              <p className="text-sm text-red-600 mt-1">Please enter a valid URL</p>
            )}
          </div>

          {fileInfo && !error && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                {getFileIcon(fileInfo.type)}
                <div>
                  <p className="font-medium text-blue-900">{fileInfo.name}</p>
                  <p className="text-sm text-blue-700">
                    {formatFileSize(fileInfo.size)} • {fileInfo.type}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="scanForViruses"
              checked={scanForViruses}
              onChange={e => setScanForViruses(e.target.checked)}
              disabled={isProcessing}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <label htmlFor="scanForViruses" className="text-sm text-gray-700">
              Scan file for viruses before downloading (VirusTotal)
            </label>
          </div>
          <button
            onClick={handleDownload}
            disabled={!url.trim() || !isValidUrl(url) || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Start Download
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Download Failed</p>
                  <p className="text-sm text-red-700">{error}</p>
                  {virusScanResult && (
                    <div className="mt-2 text-xs text-red-700">
                      <strong>VirusTotal scan result:</strong><br />
                      Malicious: {virusScanResult.stats?.malicious ?? 0}<br />
                      Suspicious: {virusScanResult.stats?.suspicious ?? 0}<br />
                      Harmless: {virusScanResult.stats?.harmless ?? 0}<br />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={resetDownloader}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {(isProcessing || stages.some(stage => stage.completed)) && (
            <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Progress</h3>
              
              {stages.map((stage, index) => (
                <div key={stage.name} className="space-y-2">
                  <ProgressBar
                    progress={stage.progress}
                    message={stage.message}
                    color={stage.color}
                  />
                  {stage.completed && !error && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Stage completed successfully!</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {canInstantDownload && fileInfo && (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Download Complete!</h3>
              </div>
              <p className="text-green-700 mb-4">
                <strong>{fileInfo.name}</strong> ({formatFileSize(fileInfo.size)}) has been downloaded successfully. 
                Click the button below to save it to your device.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleInstantDownload}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Save to Device
                </button>
                <button
                  onClick={resetDownloader}
                  className="px-6 py-3 border border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors duration-200"
                >
                  Download Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileDownloader;