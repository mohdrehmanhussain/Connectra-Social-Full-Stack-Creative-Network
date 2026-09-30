import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { downloadCompleteProjectZip } from '../utils/zipBuilder';

interface ArchitectureViewProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ onToast }) => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('social_media/backend/api/models.py');
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    apiClient
      .getProjectFiles()
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fileKeys = Object.keys(files);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    onToast('success', 'Copied to clipboard', `${label} copied.`);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const { fileCount, byteSize } = await downloadCompleteProjectZip();
      const kb = Math.max(1, Math.round(byteSize / 1024));
      onToast(
        'success',
        `Downloaded ${fileCount} files (${kb} KB)`,
        'connectra_social_media_project.zip is saved to your Downloads folder.'
      );
    } catch (err: any) {
      onToast('error', 'Download failed', err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Architecture Overview Banner + ZIP Download */}
      <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
              Full-Stack Django + DRF Project Source & ZIP Archive
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Download the complete project archive including the{' '}
              <code className="font-mono-tabular text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                social_media/
              </code>{' '}
              Django + Django REST Framework backend, SQLite/PostgreSQL models, seed script, Vanilla
              HTML/CSS/JS frontend, and full-stack TypeScript application.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="px-5 py-3 text-xs sm:text-sm font-semibold bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors inline-flex items-center gap-2.5 shrink-0 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <i className="fa-solid fa-file-zipper text-base" aria-hidden="true" />
            <span>{downloadingZip ? 'Packaging ZIP...' : 'Download Project (.zip)'}</span>
          </button>
        </div>

        {/* Quick Setup & Migration Commands */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                1. Django Setup & Database Migrations
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'cd social_media\npip install -r requirements.txt\ncd backend\npython manage.py makemigrations api\npython manage.py migrate\npython manage.py seed_data\npython manage.py runserver 0.0.0.0:8000',
                    'Migration & run commands'
                  )
                }
                className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
              >
                Copy Commands
              </button>
            </div>
            <pre className="font-mono-tabular text-xs text-slate-700 dark:text-slate-300 overflow-x-auto leading-relaxed">
{`cd social_media
pip install -r requirements.txt
cd backend
python manage.py makemigrations api
python manage.py migrate
python manage.py seed_data
python manage.py runserver 0.0.0.0:8000`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                2. Sample Login Credentials (10 Seeded Users)
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy('Username: elena_rostova | Password: AetherPass2026!', 'Demo credentials')
                }
                className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
              >
                Copy Credentials
              </button>
            </div>
            <div className="font-mono-tabular text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p>User 1: elena_rostova / elena@aether.social</p>
              <p>User 2: marcus_vance / marcus@aether.social</p>
              <p>User 3: sora_takahashi / sora@aether.social</p>
              <p>User 4: liam_oconnor / liam@aether.social</p>
              <p>User 5: amara_okafor / amara@aether.social</p>
              <p className="text-blue-700 dark:text-blue-400 font-medium pt-1">
                Password (all demo accounts): AetherPass2026!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Source File Viewer */}
      <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Project Files ({fileKeys.length})
          </p>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {fileKeys.map((pathKey) => (
              <button
                key={pathKey}
                type="button"
                onClick={() => setSelectedFile(pathKey)}
                className={`w-full px-3 py-2 text-left rounded-xl text-xs font-mono-tabular truncate transition-colors ${
                  selectedFile === pathKey
                    ? 'bg-slate-900 text-white dark:bg-blue-700 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {pathKey}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#0D1119]">
            <span className="font-mono-tabular text-xs font-medium text-slate-900 dark:text-slate-100">
              {selectedFile}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(files[selectedFile] || '', selectedFile)}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-100"
            >
              Copy File Source
            </button>
          </div>
          <div className="p-5 overflow-x-auto max-h-[560px] bg-slate-950 text-slate-100">
            {loading ? (
              <p className="text-xs text-slate-400">Loading project source files...</p>
            ) : (
              <pre className="font-mono-tabular text-xs leading-relaxed">
                <code>{files[selectedFile] || ''}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
