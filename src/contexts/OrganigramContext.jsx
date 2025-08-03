import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/apiService';

const OrganigramContext = createContext();

export function OrganigramProvider({ children }) {
  const [organigram, setOrganigram] = useState(null);
  const [progress, setProgress] = useState(0);
  const [missingDocuments, setMissingDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganigramTree();
    fetchProgress();
    fetchMissingNodes();
  }, []);

  // Fetch organigram tree (NEW)
  const fetchOrganigramTree = async () => {
    try {
      setLoading(true);
      setError(null);
      const tree = await apiService.organigram.getTree();
      // If tree is an array, but we want a single root node for UI, wrap it
      setOrganigram(tree.length === 1 ? tree[0] : { name: 'Root', children: tree });
    } catch (err) {
      setError(err.message || 'Failed to load organigram');
      toast({
        title: "Error",
        description: "Failed to load organigram data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch progress (NEW)
  const fetchProgress = async () => {
    try {
      const data = await apiService.organigram.getProgress();
      setProgress(data.percent);
    } catch (err) {
      setProgress(0);
    }
  };

  // Fetch missing nodes (NEW)
  const fetchMissingNodes = async () => {
    try {
      const data = await apiService.organigram.getMissing();
      setMissingDocuments(data);
    } catch (err) {
      setMissingDocuments([]);
    }
  };

  // Helper: get missing documents from the tree (not from archive)
  function getMissingDocumentsFromTree(tree) {
    const missing = [];
    function traverse(node) {
      if (!node) return;
      // Only count parent_document or child_document with no file
      if ((node.type === 'parent_document' || node.type === 'child_document') && !node.file) {
        missing.push(node);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(traverse);
      }
    }
    traverse(tree);
    return missing;
  }

  // Update node status (upload file, rename, move, etc.)
  const updateNodeStatus = async (nodeId, updates) => {
    try {
      setLoading(true);
      const updated = await apiService.organigram.updateNode(nodeId, updates);
      if (updated) {
        fetchOrganigramTree();
        fetchProgress();
        fetchMissingNodes();
        toast({
          title: "Success",
          description: `Noeud mis à jour avec succès` // Node updated successfully
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to update node",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrganigramContext.Provider value={{ organigram, progress, missingDocuments, loading, error, fetchOrganigramTree, updateNodeStatus, getMissingDocuments: getMissingDocumentsFromTree }}>
      {children}
    </OrganigramContext.Provider>
  );
}

export const useOrganigram = () => {
  const context = useContext(OrganigramContext);
  if (!context) {
    throw new Error('useOrganigram must be used within an OrganigramProvider');
  }
  return context;
};
