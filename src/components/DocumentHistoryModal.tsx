import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Loader2,
  History,
  Upload,
  Edit,
  Share2,
  Archive,
  Trash2,
  RefreshCw,
  User,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDocumentHistory,
  fetchDocumentVersions,
  getDocumentTypeLabel,
  formatFileSize,
  DeviceDocument,
  DocumentHistoryEntry,
} from '../lib/api/device-documents';

interface DocumentHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DeviceDocument | null;
}

const actionConfig: Record<string, { icon: typeof Upload; color: string; label: string }> = {
  created: { icon: Upload, color: 'text-green-600 bg-green-100', label: 'Created' },
  updated: { icon: Edit, color: 'text-blue-600 bg-blue-100', label: 'Updated' },
  shared: { icon: Share2, color: 'text-purple-600 bg-purple-100', label: 'Shared' },
  unshared: { icon: Share2, color: 'text-gray-600 bg-gray-100', label: 'Unshared' },
  versioned: { icon: RefreshCw, color: 'text-cyan-600 bg-cyan-100', label: 'New Version' },
  archived: { icon: Archive, color: 'text-yellow-600 bg-yellow-100', label: 'Archived' },
  deleted: { icon: Trash2, color: 'text-red-600 bg-red-100', label: 'Deleted' },
};

export default function DocumentHistoryModal({
  open,
  onOpenChange,
  document
}: DocumentHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [versions, setVersions] = useState<DeviceDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'versions'>('history');

  useEffect(() => {
    if (open && document) {
      loadData();
    }
  }, [open, document]);

  const loadData = async () => {
    if (!document) return;
    setLoading(true);

    try {
      // Load history and versions in parallel
      const [historyResult, versionsResult] = await Promise.all([
        getDocumentHistory(document.id),
        fetchDocumentVersions(document.id)
      ]);

      if (historyResult.error) {
        toast.error('Failed to load document history');
      } else {
        setHistory(historyResult.data || []);
      }

      if (versionsResult.error) {
        toast.error('Failed to load document versions');
      } else {
        setVersions(versionsResult.data || []);
      }
    } catch (error) {
      toast.error('Failed to load document data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (actionType: string) => {
    const config = actionConfig[actionType] || actionConfig.updated;
    const IconComponent = config.icon;
    return (
      <div className={`p-2 rounded-full ${config.color}`}>
        <IconComponent className="h-4 w-4" />
      </div>
    );
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Document History
          </DialogTitle>
          <DialogDescription>
            Viewing history for "{document.title}" (v{document.version})
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#00a8b5] text-[#00a8b5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('history')}
          >
            Activity History
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'versions'
                ? 'border-[#00a8b5] text-[#00a8b5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('versions')}
          >
            Version History ({versions.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-[#00a8b5]" />
            </div>
          ) : activeTab === 'history' ? (
            <ScrollArea className="h-full max-h-[400px]">
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>No activity history found</p>
                </div>
              ) : (
                <div className="space-y-4 py-4 pr-4">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        {getActionIcon(entry.action_type)}
                        {index < history.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 my-2" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">
                            {actionConfig[entry.action_type]?.label || entry.action_type}
                          </span>
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(entry.performed_at)}
                          </span>
                        </div>

                        {entry.action_description && (
                          <p className="text-sm text-slate-600 mb-2">
                            {entry.action_description}
                          </p>
                        )}

                        {/* Show old/new values for updates */}
                        {entry.old_value && entry.new_value && (
                          <div className="text-xs bg-slate-50 rounded p-2 space-y-1">
                            <div className="flex gap-2">
                              <span className="text-red-600 font-medium">-</span>
                              <span className="text-slate-600">
                                {typeof entry.old_value === 'string'
                                  ? entry.old_value
                                  : JSON.stringify(JSON.parse(entry.old_value), null, 2)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-green-600 font-medium">+</span>
                              <span className="text-slate-600">
                                {typeof entry.new_value === 'string'
                                  ? entry.new_value
                                  : JSON.stringify(JSON.parse(entry.new_value), null, 2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full max-h-[400px]">
              {versions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <RefreshCw className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>No version history found</p>
                </div>
              ) : (
                <div className="space-y-3 py-4 pr-4">
                  {versions.map((ver, index) => (
                    <div
                      key={ver.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        ver.id === document.id
                          ? 'border-[#00a8b5] bg-[#00a8b5]/5'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">
                            Version {ver.version}
                          </span>
                          {ver.is_latest && (
                            <Badge className="bg-green-100 text-green-800">Latest</Badge>
                          )}
                          {ver.status === 'superseded' && (
                            <Badge variant="secondary">Superseded</Badge>
                          )}
                          {ver.id === document.id && (
                            <Badge variant="outline">Current</Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 space-y-1">
                          <p className="flex items-center gap-4">
                            <span>{ver.file_name}</span>
                            <span>{formatFileSize(ver.file_size)}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(ver.created_at)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <a
                          href={ver.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00a8b5] hover:underline text-sm"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
