import { useState } from "react";
import { useOrganigram } from "@/contexts/OrganigramContext";
import { Download, History, File, Folder, Plus, Upload, Edit, Trash2, ChevronDown, ChevronRight, CheckCircle, Circle, Pencil, X } from 'lucide-react';
import VersionsDialog from './VersionsDialog';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiService from '@/services/apiService';

export default function DocumentNode({ node, level = 0 }) {
  const { organigram, updateNodeStatus, fetchOrganigramTree } = useOrganigram();
  const { hasPermission, user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState("parent_document");
  const [newDocDialogOpen, setNewDocDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editType, setEditType] = useState(node.type || 'parent_document');

  const hasChildren = node.children && node.children.length > 0;
  const isCompleted = !!node.file;
  const isRoot = node.parent === null;

  // Node type logic
  // type: 'parent_document', 'parent_node', 'child_document'
  const type = node.type || 'parent_document'; // fallback for existing nodes
  const canAddChild = (type === 'parent_document' || type === 'parent_node' || isRoot);
  const canUploadFile = (type === 'parent_document' || type === 'child_document');

  // --- RBAC: Check if user has rights for this node ---
  const canCrud = () => {
    if (!user || !user.roles) return false;
    if (user.roles.some(r => r.name === 'admin')) return true;
    return user.roles.some(r => Array.isArray(r.organigramNodes) && r.organigramNodes.some(n => {
      if (typeof n === 'object' && n.node) {
        const nodeId = n.node._id ? n.node._id : n.node;
        return (nodeId === node._id) && n.permissions === 'crud';
      }
      return false;
    }));
  };
  const canView = () => {
    if (!user || !user.roles) return false;
    if (user.roles.some(r => r.name === 'admin')) return true;
    return user.roles.some(r => Array.isArray(r.organigramNodes) && r.organigramNodes.some(n => {
      if (typeof n === 'object' && n.node) {
        const nodeId = n.node._id ? n.node._id : n.node;
        return (nodeId === node._id) && (n.permissions === 'view' || n.permissions === 'crud');
      }
      return false;
    }));
  };

  // Show upload button for parent_document (even if has children), and for child_document (if leaf)
  const showUploadButton = (
    (type === 'parent_document' && canCrud()) ||
    (type === 'child_document' && !hasChildren && canCrud())
  );

  // Add child node
  const handleAddNode = async () => {
    if (!newDocName.trim()) return;
    await apiService.organigram.createNode({ name: newDocName, parent: node._id, type: newDocType });
    setNewDocName("");
    setNewDocDialogOpen(false);
    fetchOrganigramTree();
  };

  // Upload file to this node
  const handleUploadFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    // Upload file to backend (reuse archive uploadFiles for demo)
    const [fileUrl] = await apiService.uploadFiles([selectedFile]);
    await apiService.organigram.uploadFile(node._id, fileUrl);
    setUploading(false);
    setUploadDialogOpen(false);
    setSelectedFile(null);
    // Reload the page after upload
    window.location.reload();
  };

  // Remove file from this node
  const handleRemoveFile = async () => {
    if (!window.confirm('Are you sure you want to remove the file from this node?')) return;
    await apiService.organigram.updateNode(node._id, { file: null });
    fetchOrganigramTree();
  };

  // Delete node
  const handleDeleteNode = async () => {
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      await apiService.organigram.deleteNode(node._id);
      fetchOrganigramTree();
    }
  };

  // Edit node
  const handleEditNode = async () => {
    if (!editName.trim()) return;
    await apiService.organigram.updateNode(node._id, { name: editName, type: editType });
    setEditDialogOpen(false);
    fetchOrganigramTree();
  };

  // --- Only render node if user has view or crud right ---
  if (!canView()) return null;

  return (
    <div className="document-node ml-4">
      <div className="flex items-center space-x-2">
        {/* Expand/collapse button for folders */}
        {hasChildren && (
          <button onClick={() => setExpanded(!expanded)} className="mr-1">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        {/* Node icon */}
        {isCompleted ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-gray-400" />}
        <span className="font-mono text-xs" title={node._id}>{node.name}</span>
        {/* Download file button (for nodes with a file) */}
        {node.file && (
          <>
            <a
              href={node.file}
              target="_blank"
              rel="noopener noreferrer"
              className="h-6 w-6 flex items-center justify-center"
              download
              style={{ textDecoration: 'none' }}
              title="Télécharger le fichier"
            >
              <Download className="h-4 w-4" />
            </a>
            {/* Versions button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setVersionsDialogOpen(true)}
              title="View versions"
            >
              <History className="h-4 w-4" />
            </Button>
          </>
        )}
        {/* Add child node button (CRUD right) */}
        {canAddChild && canCrud() && (
          <Dialog open={newDocDialogOpen} onOpenChange={setNewDocDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Child Node</DialogTitle>
                <DialogDescription>Ajoutez un sous-noeud à ce noeud</DialogDescription>
              </DialogHeader>
              <div className="py-4 flex flex-col gap-2">
                <Input
                  placeholder="Node name"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                />
                <select className="border rounded px-2 py-1" value={newDocType} onChange={e => setNewDocType(e.target.value)}>
                  <option value="parent_document">Parent Document</option>
                  <option value="parent_node">Parent Node (no file)</option>
                  <option value="child_document">Child Document</option>
                </select>
              </div>
              <DialogFooter>
                <Button onClick={handleAddNode}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Upload file button (CRUD right) */}
        {showUploadButton && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Upload className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>Ajoutez un fichier à ce noeud</DialogDescription>
              </DialogHeader>
              <div className="py-4 flex flex-col gap-2">
                <Input type="file" onChange={e => setSelectedFile(e.target.files[0])} />
              </div>
              <DialogFooter>
                <Button onClick={handleUploadFile} disabled={uploading || !selectedFile}>
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Edit node button (CRUD right) */}
        {canCrud() && (
          <>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Node</DialogTitle>
                  <DialogDescription>Change the name and type of this node. You can also replace or remove the uploaded file.</DialogDescription>
                </DialogHeader>
                <div className="py-4 flex flex-col gap-2">
                  <Input
                    placeholder="Node name"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                  <select className="border rounded px-2 py-1" value={editType} onChange={e => setEditType(e.target.value)}>
                    <option value="parent_document">Parent Document</option>
                    <option value="parent_node">Parent Node (no file)</option>
                    <option value="child_document">Child Document</option>
                  </select>
                  {/* File management */}
                  {node.file ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Current file: <a href={node.file} target="_blank" rel="noopener noreferrer" className="underline">View</a></span>
                      <Button variant="destructive" size="sm" onClick={handleRemoveFile}>Remove File</Button>
                      <span className="text-xs text-muted-foreground mt-2">Or upload a new file to replace:</span>
                      <Input type="file" onChange={e => setSelectedFile(e.target.files[0])} />
                      <Button onClick={handleUploadFile} disabled={uploading || !selectedFile} size="sm">
                        {uploading ? 'Uploading...' : 'Replace File'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      <Input type="file" onChange={e => setSelectedFile(e.target.files[0])} />
                      <Button onClick={handleUploadFile} disabled={uploading || !selectedFile} size="sm">
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleEditNode}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
        {/* Versions Dialog */}
        <VersionsDialog
          open={versionsDialogOpen}
          onOpenChange={setVersionsDialogOpen}
          versions={node.versions || []}
          currentFile={node.file}
          documentName={node.name}
        />
        {/* Delete node button (CRUD right) */}
        {canCrud() && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDeleteNode}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {/* Render children if expanded */}
      {expanded && hasChildren && (
        <div className="node-children ml-4">
          {node.children.map(child => (
            <DocumentNode key={child._id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
