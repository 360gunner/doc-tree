import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const VersionsDialog = ({
  open,
  onOpenChange,
  versions = [],
  currentFile,
  documentName = 'Document'
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Versions of {documentName}</DialogTitle>
          <DialogDescription>
            View and manage all versions of this document
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {versions.length > 0 ? (
            <div className="space-y-2">
              {versions.map((version, idx) => (
                <div 
                  key={version._id || idx} 
                  className={`p-3 border rounded-lg ${
                    version.file === currentFile 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {version.reference || `Version ${idx + 1}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(version.uploadedAt).toLocaleString()}
                      </div>
                      {version.uploadedBy && (
                        <div className="text-sm text-gray-500">
                          Uploaded by: {
                            typeof version.uploadedBy === 'object' 
                              ? version.uploadedBy.username 
                              : 'Unknown'
                          }
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={version.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        download
                        title="Download this version"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {version.file === currentFile && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No versions available
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VersionsDialog;
