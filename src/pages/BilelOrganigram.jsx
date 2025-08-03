import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronsRight, Plus, Upload, Download, Edit, Trash2, ChevronDown, ChevronRight, CheckCircle, Circle, History } from 'lucide-react';
import VersionsDialog from '@/components/organigram/VersionsDialog';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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

// --- InfoBox Component ---
// Renders a single node box with its title, children, and action buttons.
const InfoBox = React.forwardRef(({ 
  node, 
  onAddChild, 
  onUploadFile, 
  onEdit, 
  onDelete, 
  canCrud, 
  canView 
}, ref) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isCompleted = !!node.file;

  if (!canView) return null;

  return (
    <div ref={ref} className="border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm min-h-[70px] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {hasChildren && (
            <button onClick={() => setExpanded(!expanded)} className="mr-1">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <strong className="text-sm font-bold text-gray-800">{node.name}</strong>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-1">
          {/* Download Button */}
          {node.file && (
            <a
              href={node.file}
              target="_blank"
              rel="noopener noreferrer"
              className="h-6 w-6 flex items-center justify-center text-gray-600 hover:text-gray-900"
              download
              title="Télécharger le fichier"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          
          {/* CRUD Buttons */}
          {canCrud && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddChild(node)}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUploadFile(node)}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(node)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => onDelete(node)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Children List */}
      {expanded && hasChildren && (
        <ul className="mt-2 list-none p-0 text-xs text-gray-600">
          {node.children.map(child => (
            <li key={child._id} className="flex items-start mt-1">
              <ChevronsRight className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">{child.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

// --- Node Component ---
// Renders a single node with its children recursively
const Node = ({ 
  node, 
  level = 0, 
  onAddChild, 
  onUploadFile, 
  onEdit, 
  onDelete, 
  canCrud, 
  canView,
  onViewVersions
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isCompleted = !!node.file;
  const isRoot = node.parent === null;
  const nodeRef = useRef(null);

  // Node type logic - same as DocumentNode
  const type = node.type || 'parent_document'; // fallback for existing nodes
  const canAddChildNode = (type === 'parent_document' || type === 'parent_node' || isRoot);
  const canUploadFileToNode = (type === 'parent_document' || type === 'child_document');

  if (!canView(node)) return null;

  return (
    <div className="node-container" ref={nodeRef}>
      <div className="flex items-center space-x-2">
        {/* Expand/collapse button for folders */}
        {hasChildren && (
          <button onClick={() => setExpanded(!expanded)} className="mr-1">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        
        {/* Node content */}
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm min-h-[70px] flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400 mr-2" />
              )}
              <strong className="text-sm font-bold text-gray-800">{node.name}</strong>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-1">
              {/* Download Button */}
              {node.file && (
                <>
                  <a
                    href={node.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-6 w-6 flex items-center justify-center text-gray-600 hover:text-gray-900"
                    download
                    title="Télécharger le fichier"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-gray-600 hover:text-gray-900"
                    onClick={() => onViewVersions(node)}
                    title="View versions"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {/* CRUD Buttons */}
              {canCrud(node) && (
                <>
                  {canAddChildNode && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddChild(node)} title="Add child">
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {canUploadFileToNode && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUploadFile(node)} title="Upload file">
                      <Upload className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(node)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => onDelete(node)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Children List */}
          {expanded && hasChildren && (
            <div className="mt-2 pl-4 border-l-2 border-gray-200">
              {node.children.map(child => (
                <Node
                  key={child._id}
                  node={child}
                  level={level + 1}
                  onAddChild={onAddChild}
                  onUploadFile={onUploadFile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canCrud={canCrud}
                  canView={canView}
                  onViewVersions={onViewVersions}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Diagram Component ---
// This component renders the root node and handles the layout
const Diagram = ({ 
  data, 
  onAddChild, 
  onUploadFile, 
  onEdit, 
  onDelete, 
  canCrud, 
  canView,
  onViewVersions
}) => {
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
    const [paths, setPaths] = useState([]);
    const centralNodeRef = useRef(null);

    // Memoize the calculation of columns and creation of refs.
    // This prevents these from being recreated on every render, fixing the infinite loop.
    const { leftColumnNodes, rightColumnNodes } = useMemo(() => {
        if (!data?.children?.length) return { leftColumnNodes: [], rightColumnNodes: [] };
        
        const midPoint = Math.ceil(data.children.length / 2);
        const left = data.children.slice(0, midPoint);
        const right = data.children.slice(midPoint);
        
        // Ensure nodeRefs object has a ref for each node.
        data.children.forEach(node => {
            if (!nodeRefs.current[node._id]) {
                nodeRefs.current[node._id] = React.createRef();
            }
        });

        return { leftColumnNodes: left, rightColumnNodes: right };
    }, [data?.children]);

    // Effect to draw connectors
    useEffect(() => {
        const calculatePaths = () => {
            if (!centralNodeRef.current || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const centralRect = centralNodeRef.current.getBoundingClientRect();
            const startX = centralRect.left - containerRect.left + (centralRect.width / 2);
            const startY = centralRect.top - containerRect.top + (centralRect.height / 2);

            const newPaths = data.children.map(node => {
                const nodeEl = nodeRefs.current[node._id]?.current;
                if (!nodeEl) return null;

                const nodeRect = nodeEl.getBoundingClientRect();
                const isLeftSide = leftColumnNodes.some(n => n._id === node._id);
                
                const endY = nodeRect.top - containerRect.top + (nodeRect.height / 2);
                const endX = isLeftSide
                    ? nodeRect.right - containerRect.left
                    : nodeRect.left - containerRect.left;

                const controlX = startX + (endX - startX) / 2;
                const controlY = endY;

                return `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
            }).filter(Boolean);

            setPaths(newPaths);
        };
        
        // Use a timeout to ensure all elements have been rendered and measured.
        const timeoutId = setTimeout(calculatePaths, 0);
        window.addEventListener('resize', calculatePaths);
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', calculatePaths);
        }

    }, [data.children, leftColumnNodes]); // Dependency array is now stable.

    // If no children, just render the root node
    if (!data?.children?.length) {
      return (
        <div ref={containerRef} className="relative w-full max-w-6xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-lg">
          <Node 
            node={data} 
            onAddChild={onAddChild}
            onUploadFile={onUploadFile}
            onEdit={onEdit}
            onDelete={onDelete}
            canCrud={canCrud}
            canView={canView}
            onViewVersions={onViewVersions}
          />
        </div>
      );
    }

    return (
      <div ref={containerRef} className="relative w-full max-w-6xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex justify-center mb-10">
          <div className="text-center font-bold text-lg text-gray-700 p-3 border border-gray-300 rounded-lg bg-gray-50">
            {data.name}
          </div>
        </div>

        {/* Central Node */}
        <div ref={centralNodeRef} className="absolute top-[120px] left-1/2 -translate-x-1/2 w-16 h-16 bg-white border-2 border-gray-400 rounded-full z-10 flex items-center justify-center">
          <span className="text-xs font-medium text-center"></span>
        </div>

        {/* SVG Connectors */}
        <svg className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-current text-gray-400" />
            </marker>
          </defs>
          {paths.map((path, i) => (
            <path key={i} d={path} className="fill-none stroke-current text-gray-400" strokeWidth="1.5" markerEnd="url(#arrow)" />
          ))}
        </svg>

        {/* Main Grid for Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr] gap-x-16 gap-y-6 mt-32">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {leftColumnNodes.map(node => (
              <div key={node._id} ref={nodeRefs.current[node._id]}>
                <Node 
                  node={node}
                  onAddChild={onAddChild}
                  onUploadFile={onUploadFile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canCrud={canCrud}
                  canView={canView}
                  onViewVersions={onViewVersions}
                />
              </div>
            ))}
          </div>

          {/* Center Spacer on desktop */}
          <div className="hidden md:block"></div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            {rightColumnNodes.map(node => (
              <div key={node._id} ref={nodeRefs.current[node._id]}>
                <Node 
                  node={node}
                  onAddChild={onAddChild}
                  onUploadFile={onUploadFile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canCrud={canCrud}
                  canView={canView}
                  onViewVersions={onViewVersions}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
};

// Main Wrapper Component with RBAC and CRUD operations
const BilelOrganigram = ({ data }) => {
  const { user } = useAuth();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeForVersions, setSelectedNodeForVersions] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('child_document');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('parent_document');

  // Check user permissions for a node
  const canCrud = (node) => {
    if (!user || !user.roles) return false;
    if (user.roles.some(r => r.name === 'admin')) return true;
    return user.roles.some(r => 
      Array.isArray(r.organigramNodes) && 
      r.organigramNodes.some(n => {
        const nodeId = n.node?._id || n.node;
        return (nodeId === node._id) && n.permissions === 'crud';
      })
    );
  };

  const canView = (node) => {
    if (!user || !user.roles) return false;
    if (user.roles.some(r => r.name === 'admin')) return true;
    return user.roles.some(r => 
      Array.isArray(r.organigramNodes) && 
      r.organigramNodes.some(n => {
        const nodeId = n.node?._id || n.node;
        return (nodeId === node._id) && (n.permissions === 'view' || n.permissions === 'crud');
      })
    );
  };

  // CRUD Operations
  const handleAddChild = (parentNode) => {
    setSelectedNode(parentNode);
    setNewNodeName('');
    setNewNodeType('child_document');
    setAddDialogOpen(true);
  };

  const handleUploadFile = (node) => {
    setSelectedNode(node);
    setUploadDialogOpen(true);
  };

  const handleViewVersions = (node) => {
    setSelectedNodeForVersions(node);
    setSelectedVersions(node.versions || []);
    setVersionsDialogOpen(true);
  };

  const handleEdit = (node) => {
    setSelectedNode(node);
    setEditName(node.name);
    setEditType(node.type || 'parent_document');
    setEditDialogOpen(true);
  };

  const handleEditNode = async () => {
    if (!selectedNode) return;
    
    try {
      await apiService.organigram.updateNode(selectedNode._id, {
        name: editName,
        type: editType
      });
      setEditDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  const handleUploadFileForEdit = async () => {
    if (!selectedNode || !selectedFile) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await apiService.upload.uploadFile(formData);
      const fileUrl = response.fileUrl;
      
      await apiService.organigram.uploadFile(selectedNode._id, fileUrl);
      setEditDialogOpen(false);
      setSelectedFile(null);
      window.location.reload();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async () => {
    if (!selectedNode?.file) return;
    if (!window.confirm('Are you sure you want to remove the file from this node?')) return;
    
    try {
      await apiService.organigram.updateNode(selectedNode._id, { file: null });
      window.location.reload();
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const handleDelete = async (node) => {
    if (window.confirm(`Are you sure you want to delete "${node.name}"?`)) {
      try {
        await apiService.organigram.deleteNode(node._id);
        window.location.reload();
      } catch (error) {
        console.error('Error deleting node:', error);
      }
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newNodeName.trim() || !selectedNode) return;
    
    try {
      await apiService.organigram.createNode({
        name: newNodeName,
        parent: selectedNode._id,
        type: newNodeType
      });
      setNewNodeName('');
      setAddDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedNode) return;
    
    setUploading(true);
    try {
      const [fileUrl] = await apiService.uploadFiles([selectedFile]);
      await apiService.organigram.uploadFile(selectedNode._id, fileUrl);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      window.location.reload();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Diagram 
        data={data} 
        onAddChild={handleAddChild}
        onUploadFile={handleUploadFile}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canCrud={canCrud}
        canView={canView}
        onViewVersions={handleViewVersions}
      />

      {/* Add Node Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Child Node</DialogTitle>
            <DialogDescription>Add a new child node to {selectedNode?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Enter node name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Node Type</Label>
              <select 
                id="type"
                className="w-full border rounded-md p-2 text-sm"
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value)}
              >
                <option value="parent_document">Parent Document</option>
                <option value="parent_node">Parent Node (no file)</option>
                <option value="child_document">Child Document</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {newNodeType === 'parent_document' && 'Can have children and files'}
                {newNodeType === 'parent_node' && 'Can only have children, no files'}
                {newNodeType === 'child_document' && 'Can only have a file, no children'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              onClick={handleAddSubmit}
              disabled={!newNodeName.trim()}
            >
              Add Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>Upload a file for {selectedNode?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">
                  File
                </Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!selectedFile || uploading}>
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Node Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
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
            <select 
              className="border rounded px-2 py-1" 
              value={editType} 
              onChange={e => setEditType(e.target.value)}
            >
              <option value="parent_document">Parent Document</option>
              <option value="parent_node">Parent Node (no file)</option>
              <option value="child_document">Child Document</option>
            </select>
            
            {/* File management */}
            {selectedNode?.file ? (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  Current file: <a 
                    href={selectedNode.file} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="underline"
                  >
                    View
                  </a>
                </span>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleRemoveFile}
                >
                  Remove File
                </Button>
                <span className="text-xs text-muted-foreground mt-2">
                  Or upload a new file to replace:
                </span>
                <Input 
                  type="file" 
                  onChange={e => setSelectedFile(e.target.files[0])} 
                />
                <Button 
                  onClick={handleUploadFile} 
                  disabled={uploading || !selectedFile} 
                  size="sm"
                >
                  {uploading ? 'Uploading...' : 'Replace File'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <Input 
                  type="file" 
                  onChange={e => setSelectedFile(e.target.files[0])} 
                />
                <Button 
                  onClick={handleUploadFile} 
                  disabled={uploading || !selectedFile} 
                  size="sm"
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleEditNode}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions Dialog */}
      <VersionsDialog
        open={versionsDialogOpen}
        onOpenChange={setVersionsDialogOpen}
        versions={selectedVersions || []}
        currentFile={selectedNodeForVersions?.file}
        documentName={selectedNodeForVersions?.name}
      />
    </>
  );
};

export default BilelOrganigram;
