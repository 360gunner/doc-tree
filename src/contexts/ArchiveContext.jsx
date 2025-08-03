import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';
import { generateFolderReference } from '@/utils/folderReference';

const ArchiveContext = createContext();

export function ArchiveProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // --- PAGINATION & FILTER STATE ---
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalDocs, setTotalDocs] = useState(0);
  const [filters, setFilters] = useState({ name: '', reference: '' });

  // --- Normalize permissions from backend for easier access in frontend ---
  function normalizeCategoryPermissions(categories) {
    return categories.map(cat => ({
      ...cat,
      permissions: cat.permissions || null,
      children: cat.children ? normalizeCategoryPermissions(cat.children) : []
    }));
  }

  // Remove auto-fetch on mount and on currentCategory change (handled by DocumentList now)
  // useEffect(() => {
  //   fetchCategories();
  //   fetchDocuments(null);
  // }, [user]);

  // useEffect(() => {
  //   if (currentCategory === null) {
  //     fetchDocuments(null);
  //   } else if (currentCategory !== undefined) {
  //     fetchDocuments(currentCategory);
  //   }
  // }, [currentCategory]);

  // Only fetch categories on mount/user change
  useEffect(() => {
    fetchCategories();
  }, [user]);

  // Fetch categories as a tree
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // Always fetch as tree from now on
      const response = await apiService.archive.getCategories(true);
      setCategories(normalizeCategoryPermissions(response.data));
    } catch (err) {
      setError(err.message || 'Failed to load categories');
      toast({
        title: "Error",
        description: "Failed to load document categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents with pagination and filters (no abort logic)
  const fetchDocuments = async (categoryId = null, pageArg = page, pageSizeArg = pageSize, filtersArg = filters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.archive.getDocuments({
        categoryId,
        page: pageArg,
        pageSize: pageSizeArg,
        filters: filtersArg
      });
      // Always REPLACE the documents array with the new result
      setDocuments(response.data.data || []);
      setTotalDocs(response.data.total);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryName, parent = null) => {
    try {
      setLoading(true);
      // Check if category already exists at same parent
      if (categories.some(cat => cat.name === categoryName && cat.parent === parent)) {
        toast({
          title: "Error",
          description: "A category with this name already exists at this level",
          variant: "destructive"
        });
        return null;
      }
      
      // Get reference format from global settings
      const globalSettings = await apiService.getCachedGlobalSettings();
      const referenceFormat = globalSettings?.referenceFormat || {
        sequenceLength: 4,
        categoryMode: 'all',
        separator: '/',
        pattern: ''
      };
      
      // Generate reference for the new folder
      const reference = generateFolderReference({
        categories,
        parentId: parent,
        newFolderName: categoryName,
        referenceFormat
      });
      
      const response = await apiService.archive.createCategory({ 
        name: categoryName, 
        parent,
        reference // Include the generated reference
      });
      
      if (response.success) {
        setCategories(normalizeCategoryPermissions([...categories, response.data]));
        toast({
          title: "Success",
          description: `Category "${categoryName}" created successfully`
        });
        window.location.reload();
        return response.data;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to create category",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
    return null;
  };

  const addDocument = async (documentData) => {
    try {
      setLoading(true);
      
      const response = await apiService.archive.addDocument(documentData);
      
      if (response.success) {
        // Add new document to the list if it belongs to current category or we're showing all
        if (!currentCategory || response.data.category === currentCategory) {
          setDocuments(prev => [...prev, response.data]);
        }
        
        // Update document count for the category
        setCategories(normalizeCategoryPermissions(prev => 
          prev.map(cat => 
            cat.id === response.data.category 
              ? { ...cat, documentCount: cat.documentCount + 1 } 
              : cat
          )
        ));
        
        toast({
          title: "Success",
          description: `Document "${response.data.name}" added successfully`
        });
        
        return response.data;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to add document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
    
    return null;
  };

  const updateDocument = async (documentId, updates) => {
    try {
      setLoading(true);
      const response = await apiService.archive.updateDocument(documentId, updates);
      if (response.success && response.data) {
        // Use the backend's returned document for full sync
        setDocuments(prev =>
          prev.map(doc =>
            (doc.id === documentId || doc._id === documentId)
              ? { ...doc, ...response.data }
              : doc
          )
        );
        toast({
          title: "Success",
          description: `Document updated successfully`
        });
        // Always refresh the documents list with current filters/category/page
        await fetchDocuments(currentCategory, page, pageSize, filters);
        return true;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to update document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
    return false;
  };

  const deleteDocument = async (documentId, categoryId) => {
    try {
      setLoading(true);
      
      const response = await apiService.archive.deleteDocument(documentId);
      
      if (response.success) {
        // Remove document from the list
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        
        // Update document count for the category
        setCategories(normalizeCategoryPermissions(prev => 
          prev.map(cat => 
            cat.id === categoryId 
              ? { ...cat, documentCount: Math.max(0, cat.documentCount - 1) } 
              : cat
          )
        ));
        
        toast({
          title: "Success",
          description: `Document deleted successfully`
        });
        
        return true;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
    
    return false;
  };

  // --- CATEGORY MANAGEMENT ---
  const setCurrentCategoryAndFetch = (categoryId) => {
    setCurrentCategory(prev => {
      if (prev !== categoryId) {
        setPage(1);
      }
      return categoryId;
    });
  };

  const updateCategory = async (categoryId, newName, newParent) => {
    try {
      setLoading(true);
      const response = await apiService.archive.updateCategory(categoryId, { name: newName, parent: newParent });
      if (response.data && response.data._id) {
        // Instead of local update, always refresh the tree from backend
        await fetchCategories();
        toast({ title: "Success", description: `Category updated` });
        return true;
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to update category", variant: "destructive" });
    } finally {
      setLoading(false);
    }
    return false;
  };

  const deleteCategory = async (categoryId) => {
    try {
      setLoading(true);
      const response = await apiService.archive.deleteCategory(categoryId);
      if (response.data && response.data.success) {
        // Instead of local update, always refresh the tree from backend
        await fetchCategories();
        if (currentCategory === categoryId) setCurrentCategory(null);
        toast({ title: "Success", description: `Category deleted successfully` });
        return true;
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to delete category", variant: "destructive" });
    } finally {
      setLoading(false);
    }
    return false;
  };

  return (
    <ArchiveContext.Provider
      value={{
        categories,
        documents,
        currentCategory,
        loading,
        error,
        setCurrentCategory,
        setCurrentCategoryAndFetch,
        refreshCategories: fetchCategories,
        refreshDocuments: fetchDocuments,
        createCategory,
        updateCategory,
        deleteCategory,
        addDocument,
        updateDocument,
        deleteDocument,
        page,
        setPage,
        pageSize,
        setPageSize,
        totalDocs,
        filters,
        setFilters
      }}
    >
      {children}
    </ArchiveContext.Provider>
  );
}

export const useArchive = () => {
  const context = useContext(ArchiveContext);
  if (!context) {
    throw new Error('useArchive must be used within an ArchiveProvider');
  }
  return context;
};
