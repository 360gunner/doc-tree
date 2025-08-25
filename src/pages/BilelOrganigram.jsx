import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronsRight, Plus, Upload, Download, Edit, Trash2, ChevronDown, ChevronRight, CheckCircle, Circle, History, Link as LinkIcon, Copy } from 'lucide-react';
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
  onShare,
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
              {node.file && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onShare(node)} title="Partager par lien">
                  <LinkIcon className="h-4 w-4" />
                </Button>
              )}
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
  onShare,
  canCrud, 
  canView,
  onViewVersions,
  onMoveNode
}) => {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPos, setDropPos] = useState('inside'); // 'before' | 'inside' | 'after'
  const hasChildren = node.children && node.children.length > 0;
  const isCompleted = !!node.file;
  const isRoot = node.parent === null;
  const nodeRef = useRef(null);

  // Node type logic - same as DocumentNode
  const type = node.type || 'parent_document'; // fallback for existing nodes
  const canAddChildNode = (type === 'parent_document' || type === 'parent_node' || isRoot);
  const canUploadFileToNode = (type === 'parent_document' || type === 'child_document');

  if (!canView(node)) return null;

  // Helper to know if target node (this "node") contains a given sourceId in its subtree
  const containsNodeId = (n, id) => {
    if (!n || !id) return false;
    if (n._id === id) return true;
    if (!Array.isArray(n.children)) return false;
    return n.children.some(child => containsNodeId(child, id));
  };

  // Drag handlers
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', node._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    // Only allow drop if this node can accept children
    // We allow drag-over always to compute position; but will restrict on drop
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const topZone = rect.height * 0.25;
      const bottomZone = rect.height * 0.75;
      // Allow before/after even for root-level nodes
      if (offsetY < topZone) setDropPos('before');
      else if (offsetY > bottomZone) setDropPos('after');
      else setDropPos('inside');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId) { console.debug('DnD: missing sourceId'); return; }
    if (sourceId === node._id) { console.debug('DnD: cannot drop onto self'); return; }
    // Prevent dropping a node into its own descendant
    if (containsNodeId({ ...node }, sourceId)) { console.debug('DnD: cannot drop into descendant'); return; }
    // Do not require CRUD on target; backend checks CRUD on source node

    // Determine new parent and optional order for sibling reordering
    let newParentId = node._id; // default: drop inside
    let orderPayload = undefined;
    if (dropPos === 'before' || dropPos === 'after') {
      // dropping as sibling: if target is root-level, new parent is null
      newParentId = node.parent === null ? null : node.parent;
      const base = typeof node.order === 'number' ? node.order : 0;
      orderPayload = { order: dropPos === 'before' ? base - 0.5 : base + 0.5 };
    } else {
      // inside: only if node can accept children
      if (!canAddChildNode) { setIsDragOver(false); setDropPos('inside'); return; }
    }

    console.debug('DnD: dropping', { sourceId, targetId: node._id, dropPos, newParentId, orderPayload });
    onMoveNode && onMoveNode(sourceId, newParentId, orderPayload);
    setIsDragOver(false);
    setDropPos('inside');
  };

  const handleDragLeave = () => setIsDragOver(false);

  return (
    <div
      ref={nodeRef}
      draggable={canCrud(node)}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      className={`node-container ${isDragOver ? 'ring-2 ring-primary/50 rounded' : ''} ${dropPos === 'before' ? 'border-t-2 border-primary' : ''} ${dropPos === 'after' ? 'border-b-2 border-primary' : ''}`}
    >
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
                  {node.file && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => onShare(node)} 
                      title="Partager par lien"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(node)} title="Modifier (changer le type)">
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
              {node.children
                .slice()
                .sort((a, b) => (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0))
                .map(child => (
                <Node
                  key={child._id}
                  node={child}
                  level={level + 1}
                  onAddChild={onAddChild}
                  onUploadFile={onUploadFile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onShare={onShare}
                  canCrud={canCrud}
                  canView={canView}
                  onViewVersions={onViewVersions}
                  onMoveNode={onMoveNode}
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
  onShare,
  canCrud, 
  canView,
  onViewVersions,
  onMoveNode
}) => {
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
    const [paths, setPaths] = useState([]);
    const centralNodeRef = useRef(null);

    // Memoize the calculation of columns and creation of refs.
    // This prevents these from being recreated on every render, fixing the infinite loop.
    const { leftColumnNodes, rightColumnNodes } = useMemo(() => {
        if (!data?.children?.length) return { leftColumnNodes: [], rightColumnNodes: [] };
        
        // Sort root children by order so visual order matches persisted order
        const sorted = data.children.slice().sort((a, b) => {
          const ao = typeof a.order === 'number' ? a.order : 0;
          const bo = typeof b.order === 'number' ? b.order : 0;
          return ao - bo;
        });
        const midPoint = Math.ceil(sorted.length / 2);
        const left = sorted.slice(0, midPoint);
        const right = sorted.slice(midPoint);
        
        // Ensure nodeRefs object has a ref for each node.
        sorted.forEach(node => {
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
            onShare={onShare}
            canCrud={canCrud}
            canView={canView}
            onViewVersions={onViewVersions}
            onMoveNode={onMoveNode}
          />
        </div>
      );
    }

    return (
      <div ref={containerRef} className="relative w-full max-w-6xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex justify-center mb-10">
          <div className="font-bold text-lg text-gray-700 p-3 border border-gray-300 rounded-lg bg-gray-50 inline-flex items-center gap-2">
            <span className="text-center">{data.name}</span>
            {canCrud && canCrud(data) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                title="Ajouter un enfant à la racine"
                onClick={() => onAddChild(data)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
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
                  onShare={onShare}
                  canCrud={canCrud}
                  canView={canView}
                  onViewVersions={onViewVersions}
                  onMoveNode={onMoveNode}
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
                  onShare={onShare}
                  canCrud={canCrud}
                  canView={canView}
                  onViewVersions={onViewVersions}
                  onMoveNode={onMoveNode}
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
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNodeForDelete, setSelectedNodeForDelete] = useState(null);
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedNodeForShare, setSelectedNodeForShare] = useState(null);
  const [shareEnabled, setShareEnabled] = useState(true);
  const [expiresInHours, setExpiresInHours] = useState(168);
  const [shareResultUrl, setShareResultUrl] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [selectedNodeForVersions, setSelectedNodeForVersions] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('child_document');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('parent_document');
  // Missing states
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);

  // Move node (DnD): change parent of a node to targetNode
  const handleMoveNode = async (sourceNodeId, newParentId, orderPayload) => {
    try {
      const payload = { parent: newParentId, ...(orderPayload || {}) };
      await apiService.organigram.updateNode(sourceNodeId, payload);
      console.debug('Moved node', sourceNodeId, 'to parent', newParentId, 'with', payload);
      window.location.reload();
    } catch (error) {
      console.error('Error moving node:', error);
    }
  };

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

  const handleShare = (node) => {
    setSelectedNodeForShare(node);
    setShareDialogOpen(true);
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNodeForShare) return;
    
    try {
      const response = await apiService.organigram.shareNode(selectedNodeForShare._id, {
        enabled: shareEnabled,
        expiresInHours,
        // Optional password support (backend must accept this field)
        password: sharePassword && shareEnabled ? sharePassword : undefined
      });
      // Prefer frontend share URL: /share/:token
      const token = response?.token || (response?.url ? String(response.url).split('/').pop() : '');
      const fullUrl = token ? `${window.location.origin}/share/${token}` : '';
      setShareResultUrl(fullUrl);
    } catch (error) {
      console.error('Error generating public link:', error);
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareResultUrl);
  };

  return (
    <>
      <Diagram 
        data={data}
        onAddChild={handleAddChild}
        onUploadFile={handleUploadFile}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        canCrud={canCrud}
        canView={canView}
        onViewVersions={handleViewVersions}
        onMoveNode={handleMoveNode}
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

      {/* Share Dialog (aligned with dossier/list style) */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager le noeud</DialogTitle>
            <DialogDescription>
              Générer un lien public optionnellement protégé par mot de passe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleShareSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="share-enabled"
                type="checkbox"
                checked={shareEnabled}
                onChange={(e) => setShareEnabled(e.target.checked)}
              />
              <Label htmlFor="share-enabled">Activer le partage</Label>
            </div>

            <div>
              <Label htmlFor="expiresInHours">Expiration (heures)</Label>
              <Input
                id="expiresInHours"
                type="number"
                min={1}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label htmlFor="sharePassword">Mot de passe (optionnel)</Label>
              <Input
                id="sharePassword"
                type="password"
                placeholder="Laisser vide pour aucun mot de passe"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                disabled={!shareEnabled}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit">Générer le lien</Button>
              {shareResultUrl && (
                <>
                  <Input readOnly value={shareResultUrl} className="flex-1" />
                  <Button type="button" variant="outline" onClick={copyShareUrl} title="Copier le lien">
                    <Copy className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </form>

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
        onShareClick={() => {
          if (selectedNodeForVersions) {
            setSelectedNodeForShare(selectedNodeForVersions);
            setShareDialogOpen(true);
          }
        }}
      />
    </>
  );
};

export default BilelOrganigram;
