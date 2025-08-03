import React, { useState, useRef } from "react";
import { useArchive } from "@/contexts/ArchiveContext";
import { File, Plus, X, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { generateReferencePreview } from "@/utils/referencePreview";
import _ from 'lodash';

export default function DocumentList() {
  const { documents: allDocuments, currentCategory, categories, addDocument, deleteDocument, page, setPage, pageSize, setPageSize, totalDocs, filters, setFilters, refreshDocuments, updateDocument, setCurrentCategoryAndFetch } = useArchive();
  const { hasPermission, user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: "",
    category: currentCategory || "",
    reference: "",
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [pendingFilters, setPendingFilters] = React.useState(filters);
  const [lastFetchDeps, setLastFetchDeps] = React.useState({ page, pageSize, filters, currentCategory: currentCategory });
  const isRestoring = useRef(true);
  const restoreState = useRef(null);

  // Helper: flatten categories tree for select input
  const flattenCategories = (cats, prefix = "") => {
    let result = [];
    for (const cat of cats) {
      const label = prefix ? `${prefix} / ${cat.name}` : cat.name;
      result.push({ id: cat._id || cat.id, label });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategories(cat.children, label));
      }
    }
    return result;
  };

  // Helper: flatten categories tree for select input, but only include categories where user has CRUD rights (unless admin)
  const flattenCrudCategories = (cats, hasPermission, prefix = "") => {
    let result = [];
    for (const cat of cats) {
      const id = cat._id || cat.id;
      const label = prefix ? `${prefix} / ${cat.name}` : cat.name;
      // Admin can see all
      if (cat.permissions === 'admin' || (hasPermission && hasPermission('admin'))) {
        result.push({ id, label });
        if (cat.children && cat.children.length > 0) {
          result = result.concat(flattenCrudCategories(cat.children, hasPermission, label));
        }
        continue;
      }
      // Only include if user has CRUD right for this category
      if (cat.permissions === 'crud' || (hasPermission && hasPermission('category:crud:' + id))) {
        result.push({ id, label });
        if (cat.children && cat.children.length > 0) {
          result = result.concat(flattenCrudCategories(cat.children, hasPermission, label));
        }
      } else if (cat.children && cat.children.length > 0) {
        // Still check children in case user has CRUD on subcategories
        result = result.concat(flattenCrudCategories(cat.children, hasPermission, label));
      }
    }
    return result;
  };

  // Helper: find a category in the categories tree by ID
  const findCategoryInTree = (categories, categoryId) => {
    if (!categories || !categoryId) return null;
    
    for (const category of categories) {
      if ((category._id === categoryId) || (category.id === categoryId)) {
        return category;
      }
      
      if (category.children && category.children.length > 0) {
        const found = findCategoryInTree(category.children, categoryId);
        if (found) return found;
      }
    }
    
    return null;
  };

  // Helper: flatten categories tree for select input, but only include categories where user has VIEW or CRUD rights (unless admin)
  const flattenViewCategories = (cats, hasPermission, prefix = "") => {
    let result = [];
    for (const cat of cats) {
      const id = cat._id || cat.id;
      const label = prefix ? `${prefix} / ${cat.name}` : cat.name;
      // Admin can see all
      if (cat.permissions === 'admin' || (hasPermission && hasPermission('admin'))) {
        result.push({ id, label });
        if (cat.children && cat.children.length > 0) {
          result = result.concat(flattenViewCategories(cat.children, hasPermission, label));
        }
        continue;
      }
      // Only include if user has VIEW or CRUD right for this category
      if ((cat.permissions === 'view' || cat.permissions === 'crud') || (hasPermission && (hasPermission('category:view:' + id) || hasPermission('category:crud:' + id)))) {
        result.push({ id, label });
        if (cat.children && cat.children.length > 0) {
          result = result.concat(flattenViewCategories(cat.children, hasPermission, label));
        }
      } else if (cat.children && cat.children.length > 0) {
        // Still check children in case user has rights on subcategories
        result = result.concat(flattenViewCategories(cat.children, hasPermission, label));
      }
    }
    return result;
  };

  const crudCategories = flattenCrudCategories(categories, hasPermission);
  const viewCategories = flattenViewCategories(categories, hasPermission);

  // Ensure newDocument.category is synced with currentCategory by default
  React.useEffect(() => {
    if (dialogOpen && currentCategory && (!newDocument.category || newDocument.category !== currentCategory)) {
      setNewDocument(prev => ({ ...prev, category: currentCategory }));
    }
  }, [dialogOpen, currentCategory]);

  // Extract documents only from the current category (not from children)
  const getDocumentsFromTree = (cats = categories, currentCatId = currentCategory) => {
    if (!cats || !Array.isArray(cats) || !currentCatId) return [];
    
    // Find the current category in the tree
    const findCategory = (categories, targetId) => {
      for (const cat of categories) {
        if ((cat._id || cat.id) === targetId) return cat;
        if (cat.children && cat.children.length > 0) {
          const found = findCategory(cat.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const currentCat = findCategory(cats, currentCatId);
    return currentCat && currentCat.documents ? [...currentCat.documents] : [];
  };
  
  // Get documents for the current view
  const safeDocuments = React.useMemo(() => {
    return currentCategory 
      ? getDocumentsFromTree(categories, currentCategory)
      : getDocumentsFromTree(categories);
  }, [categories, currentCategory]);

  // Helper to get the category name by id (recursive for tree, returns empty string if not found)
  const getCategoryName = (catId, cats = categories) => {
    if (!catId) return '';
    for (const cat of cats) {
      if ((cat._id || cat.id) === catId) return cat.name;
      if (cat.children && cat.children.length > 0) {
        const found = getCategoryName(catId, cat.children);
        if (found && found !== catId) return found;
      }
    }
    return '';
  };

  const getCategoryPath = (catId) => {
    let path = [];
    let current = categories.find(c => c._id === catId || c.id === catId);
    while (current) {
      path.unshift(current.name);
      if (!current.parent) break;
      current = categories.find(c => (c._id === current.parent || c.id === current.parent));
    }
    return path.join('/');
  };

  const canCrudCurrentCategory = () => {
    if (!user || !user.roles || !currentCategory) return false;
    if (user.roles.some(r => r.name === 'admin')) return true;
    return user.roles.some(r => Array.isArray(r.archiveCategories) && r.archiveCategories.some(c => {
      if (typeof c === 'object' && c.category) {
        const catId = c.category._id ? c.category._id : c.category;
        return (catId === currentCategory) && c.permissions === 'crud';
      }
      return false;
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      const file = files[0];
      setNewDocument(prev => {
        // If name is empty, set it to file name (without extension)
        let nextName = prev.name;
        if ((!prev.name || prev.name.trim() === "") && file && file.name) {
          nextName = file.name.replace(/\.[^/.]+$/, "");
        }
        return { ...prev, file, name: nextName };
      });
    } else {
      setNewDocument(prev => ({ ...prev, [name]: value }));
    }
  };

  const generateReference = () => {
    if (!newDocument.category) return "";
    const year = new Date().getFullYear();
    
    // Get current category
    const currentCategoryObj = findCategoryInTree(categories, newDocument.category);
    if (!currentCategoryObj) return "";
    
    // Get category path as array
    let catArr = [];
    let current = currentCategoryObj;
    const safetyCounter = 20; // prevent infinite loop
    let loops = 0;
    
    // Build category path array
    while (current && loops < safetyCounter) {
      catArr.unshift(current.name || current.label || current._id || current.id);
      if (!current.parent || current.parent === current._id || current.parent === current.id) break;
      current = findCategoryInTree(categories, current.parent);
      loops++;
    }
    
    if (catArr.length === 0) {
      // fallback: try to find by id in viewCategories (flat structure)
      const fallbackCat = (viewCategories || []).find(c => c.id === newDocument.category);
      catArr = [fallbackCat ? fallbackCat.label : newDocument.category];
    }
    
    // Ensure catArr is an array of names only, not joined string
    if (Array.isArray(catArr) && catArr.length === 1 && typeof catArr[0] === 'string' && catArr[0].includes('/')) {
      catArr = catArr[0].split('/').map(s => s.trim()).filter(Boolean);
    }
    
    const folderPath = catArr.join(referenceFormat.separator || '/');
    
    // Get all documents in the current category (already filtered by getDocumentsFromTree)
    const categoryDocs = safeDocuments;
    
    // Find max sequence number for current category and year
    let maxSeq = 0;
    const yearStr = year.toString();
    
    for (const doc of categoryDocs) {
      if (!doc.referencePath) continue;
      
      // Skip if document is not from the current year
      if (!doc.referencePath.includes(yearStr)) continue;
      
      // Extract sequence number from reference path
      const seqMatch = doc.referencePath.match(/(\d{1,10})(?=\D*$)/); // Match last sequence of digits before end of string
      if (seqMatch) {
        const seqNum = parseInt(seqMatch[1], 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }
    
    // Calculate next sequence number (pad with leading zeros if needed)
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    
    return generateReferencePreview({
      ...referenceFormat,
      categories: catArr,
      name: newDocument.name || "Document",
      year,
      code: nextSeq
    });
  };

  const handleCreateDocument = async () => {
    // If name is empty and a file is uploaded, use the file name (without extension) as the document name
    let docName = newDocument.name.trim();
    if (!docName && newDocument.file) {
      const fileName = newDocument.file.name || '';
      docName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    }
    if (!docName || !newDocument.category) return;
    // reference will be generated by backend, but we show preview
    let fileUrls = [];
    if (newDocument.file) {
      setUploading(true);
      try {
        fileUrls = await apiService.uploadFiles([newDocument.file]);
      } catch (err) {
        setUploading(false);
        alert('File upload failed: ' + (err?.message || 'Unknown error'));
        return;
      }
      setUploading(false);
    } else {
      fileUrls = [];
    }
    // Get the reference from the preview
    const reference = referencePreview;
    
    await addDocument({
      name: docName,
      category: newDocument.category,
      reference,
      fileUrls
    });
    setNewDocument({
      name: "",
      category: currentCategory || "",
      reference: "",
      file: null
    });
    setDialogOpen(false);
    window.location.reload();
  };

  const handleDeleteDocument = async (document) => {
    const docId = document._id || document.id;
    if (!docId) {
      alert('Cannot delete: Document has no id');
      return;
    }
    if (confirm(`Are you sure you want to delete "${document.name}"?`)) {
      await deleteDocument(docId, document.category);
      window.location.reload();
    }
  };

  // Handle filter input changes (update local state, not global filters)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setPendingFilters(prev => ({ ...prev, [name]: value }));
  };

  // Apply filters only on button click
  const handleSearch = () => {
    setFilters(pendingFilters);
    setPage(1);
  };

  // Update pendingFilters when filters change externally (e.g. page change)
  React.useEffect(() => {
    setPendingFilters(filters);
  }, [filters]);

  // Robust restoration and effect loop prevention
  React.useEffect(() => {
    const saved = localStorage.getItem('archivePageState');
    if (saved) {
      const { category, page, pageSize } = JSON.parse(saved);
      // Save to restoreState for batch restoration
      restoreState.current = { category, page, pageSize };
      if (category && typeof setCurrentCategoryAndFetch === 'function') {
        setCurrentCategoryAndFetch(category); // Use the correct setter from context
      }
      if (page) setPage(page);
      if (pageSize) setPageSize(pageSize);
    }
    // Wait a tick to let all state propagate, then disable restoring
    setTimeout(() => { isRestoring.current = false; }, 0);
  }, []);

  // Only update filters if the computed subcategory list is different
  React.useEffect(() => {
    if (isRestoring.current) return;
    if (!categories || categories.length === 0) return;
    if (currentCategory) {
      const exists = categories.some(cat => (cat._id || cat.id) === currentCategory);
      if (!exists) return;
      const allCatIds = getAllCategoryIds(currentCategory);
      setFilters(prev => {
        if (prev.categories && arraysEqual(prev.categories, allCatIds)) return prev;
        return { ...prev, categories: allCatIds };
      });
    } else {
      setFilters(prev => {
        if (!prev.categories || prev.categories.length === 0) return prev;
        const { categories, ...rest } = prev;
        return rest;
      });
    }
  }, [currentCategory, categories]);

  // Only fetch documents if not restoring and deps actually changed
  React.useEffect(() => {
    if (isRestoring.current) return;
    if (
      lastFetchDeps.page !== page ||
      lastFetchDeps.pageSize !== pageSize ||
      JSON.stringify(lastFetchDeps.filters) !== JSON.stringify(filters) ||
      lastFetchDeps.currentCategory !== currentCategory
    ) {
      refreshDocuments(currentCategory, page, pageSize, filters);
      setLastFetchDeps({ page, pageSize, filters, currentCategory });
    }
  }, [page, pageSize, filters, currentCategory]);

  // Save state to localStorage only after restoration
  React.useEffect(() => {
    if (isRestoring.current) return;
    localStorage.setItem('archivePageState', JSON.stringify({
      category: currentCategory,
      filters,
      page,
      pageSize
    }));
  }, [currentCategory, filters, page, pageSize]);

  const getAllCategoryIds = (catId, cats = categories) => {
    let ids = [];
    for (const cat of cats) {
      if ((cat._id || cat.id) === catId) {
        ids.push(catId);
        if (cat.children && cat.children.length > 0) {
          for (const child of cat.children) {
            ids = ids.concat(getAllCategoryIds(child._id || child.id, cat.children));
          }
        }
      } else if (cat.children && cat.children.length > 0) {
        ids = ids.concat(getAllCategoryIds(catId, cat.children));
      }
    }
    return ids;
  };

  // Helper: deep compare arrays
  function arraysEqual(a, b) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Pagination controls
  const totalPages = Math.ceil(totalDocs / pageSize);

  // --- Reference preview state ---
  const [referenceFormat, setReferenceFormat] = useState(null);
  const [referencePreview, setReferencePreview] = useState("");
  // Fetch global reference format settings on mount
  React.useEffect(() => {
    async function fetchReferenceFormat() {
      const settings = await apiService.getGlobalSettings();
      setReferenceFormat(settings.referenceFormat || {
        sequenceLength: 4,
        categoryMode: 'all',
        separator: '/',
        pattern: ''
      });
    }
    fetchReferenceFormat();
  }, []);

  // Compute preview for new document creation
  React.useEffect(() => {
    if (!referenceFormat || !newDocument.category) {
      setReferencePreview("");
      return;
    }
    
    // Helper function to find a category by ID in the tree
    const findCategoryInTree = (cats, targetId) => {
      for (const cat of cats || []) {
        if ((cat._id || cat.id) === targetId) return cat;
        if (cat.children && cat.children.length > 0) {
          const found = findCategoryInTree(cat.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    // Get category path as array (robust, use names)
    let catArr = [];
    const findCategoryPath = (cats, targetId, path = []) => {
      for (const cat of cats || []) {
        const newPath = [...path, cat.name || cat.label || cat._id || cat.id];
        if ((cat._id || cat.id) === targetId) return newPath;
        if (cat.children && cat.children.length > 0) {
          const foundPath = findCategoryPath(cat.children, targetId, newPath);
          if (foundPath) return foundPath;
        }
      }
      return null;
    };
    
    // Find the category path
    const path = findCategoryPath(categories, newDocument.category);
    let current = null;
    
    if (path) {
      catArr = path;
    } else {
      // Fallback to old method if path not found
      current = findCategoryInTree(categories, newDocument.category);
      const safetyCounter = 20;
      let loops = 0;
      while (current && loops < safetyCounter) {
        catArr.unshift(current.name || current.label || current._id || current.id);
        if (!current.parent || current.parent === (current._id || current.id)) break;
        current = findCategoryInTree(categories, current.parent);
        loops++;
      }
    }
    
    // If we still don't have a path, try to get the current category directly
    if (catArr.length === 0) {
      current = current || findCategoryInTree(categories, newDocument.category);
      if (current) {
        catArr = [current.name || current.label || current._id || current.id];
      }
    }
    
    // Final fallback if we still don't have a path
    if (catArr.length === 0) {
      // fallback: try to find by id in viewCategories (flat structure)
      const fallbackCat = (viewCategories || []).find(c => c.id === newDocument.category);
      catArr = [fallbackCat ? fallbackCat.label : newDocument.category];
    }
    // Ensure catArr is an array of names only, not joined string
    if (Array.isArray(catArr) && catArr.length === 1 && typeof catArr[0] === 'string' && catArr[0].includes('/')) {
      catArr = catArr[0].split('/').map(s => s.trim()).filter(Boolean);
    }
    // Debug
    // console.log('catArr for reference generation:', catArr);
    // Compute next sequence number for this category/year
    const year = new Date().getFullYear();
    const folderPath = catArr.join(referenceFormat.separator || '/');
    
    // Use safeDocuments.length to get the next sequence number
    // safeDocuments already contains only documents in the current category
    const nextSeq = (safeDocuments.length + 1).toString().padStart(4, '0');
    
    // Generate the reference preview with the next sequence number
    setReferencePreview(generateReferencePreview({
      ...referenceFormat,
      categories: catArr,
      name: newDocument.name || "Document",
      year,
      code: nextSeq
    }));
  }, [referenceFormat, newDocument.category, newDocument.name, safeDocuments]);

  return (
    <div>
      {/* Move Create Document Button next to filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-end justify-between">
        <div className="flex gap-2">
          <Input
            type="text"
            name="name"
            placeholder="Nom du document"
            value={pendingFilters.name}
            onChange={handleFilterChange}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            className="w-48"
          />
          <Input
            type="text"
            name="reference"
            placeholder="Référence"
            value={pendingFilters.reference}
            onChange={handleFilterChange}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            className="w-48"
          />
          {/* Add more filters as needed */}
          <Button onClick={handleSearch} className="bg-blue-600 text-white hover:bg-blue-700">Recherche</Button>
        </div>
        {canCrudCurrentCategory() && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-primary text-primary-foreground font-bold shadow-md px-6 py-2 text-base border border-primary hover:bg-primary/90"
            style={{ fontWeight: 'bold' }}
          >
            <Plus className="h-4 w-4 mr-2" /> Nouveau document
          </Button>
        )}
      </div>
      <div className="flex justify-between items-center mb-4">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-xl">
              {getCategoryName(currentCategory) || 'Tous les documents'}
            </span>
          </div>
          <CardDescription>
            Liste des documents pour le dossier sélectionné.
          </CardDescription>
        </CardHeader>
        {(currentCategory && canCrudCurrentCategory()) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau document</DialogTitle>
                <DialogDescription>
                  Entrez les détails du document.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nom du document
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Nom du document"
                    className="col-span-3"
                    value={newDocument.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Dossier
                  </Label>
                  <select
                    id="category"
                    name="category"
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newDocument.category}
                    onChange={handleInputChange}
                  >
                    <option value="">Sélectionnez un dossier</option>
                    {viewCategories.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reference" className="text-right">
                    Référence
                  </Label>
                  <Input
                    id="reference"
                    name="reference"
                    placeholder={referencePreview || "DOSSIER/ANNÉE/XXXX"}
                    className="col-span-3"
                    value={referencePreview}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="file" className="text-right">
                    Téléverser
                  </Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    className="col-span-3"
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateDocument} disabled={uploading}>
                  {uploading ? 'Téléversement...' : (<><Upload className="h-4 w-4 mr-2" /> Ajouter le document</>)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter Controls */}
      {safeDocuments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <File className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-1">Aucun document trouvé</h3>
          <p className="text-muted-foreground">
            {currentCategory
              ? `Il n'y a pas de documents dans le dossier ${getCategoryName(currentCategory)} pour le moment.`
              : "Il n'y a pas de documents dans le système pour le moment."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeDocuments.map((document) => (
            <Card key={document.id || document._id} className="document-item">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-base flex items-center">
                    <File className="h-4 w-4 mr-2" />
                    {canCrudCurrentCategory() ? (
                      <EditableDocName
                        document={document}
                        updateDocument={updateDocument}
                      />
                    ) : (
                      document.name
                    )}
                  </CardTitle>
                  {hasPermission("admin") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDeleteDocument(document)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Ajouté le {document.createdAt}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-2">
                <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {canCrudCurrentCategory() ? (
                    <EditableReferenceName
                      document={document}
                      updateDocument={updateDocument}
                    />
                  ) : (
                    document.referencePath || document.reference
                  )}
                </div>
                {(Array.isArray(document.fileUrls) && document.fileUrls.length > 0) ? (
                  <div className="flex flex-col gap-1 mt-2">
                    {document.fileUrls.map((fileUrl, idx) => (
                      <a
                        key={fileUrl || idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                        download
                      >
                        Télécharger le fichier {document.fileUrls.length > 1 ? idx + 1 : ''}
                      </a>
                    ))}
                  </div>
                ) : (Array.isArray(document.files) && document.files.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    {document.files.map((fileUrl, idx) => (
                      <a
                        key={fileUrl || idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                        download
                      >
                        Télécharger le fichier {document.files.length > 1 ? idx + 1 : ''}
                      </a>
                    ))}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="pt-0">
                <span className="text-xs text-muted-foreground">
                  Dossier: {getCategoryName(document.category)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex gap-2 items-center justify-center my-4">
          <Button onClick={() => setPage(page - 1)} disabled={page === 1}>Précédent</Button>
          <span>Page {page} / {totalPages}</span>
          <Button onClick={() => setPage(page + 1)} disabled={page === totalPages}>Suivant</Button>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="ml-2 border rounded px-2 py-1">
            {[5, 10, 20, 50].map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function EditableDocName({ document, updateDocument }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(document.name);

  const handleSave = async () => {
    if (name.trim() && name.trim() !== document.name) {
      await updateDocument(document._id || document.id, { name: name.trim() });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setName(document.name);
    setEditing(false);
  };

  return (
    editing ? (
      <Input
        type="text"
        value={name}
        autoFocus
        onChange={e => setName(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        className="w-48 border border-blue-500"
      />
    ) : (
      <span
        onClick={() => setEditing(true)}
        className="cursor-pointer underline text-blue-600 hover:text-blue-800 ml-1"
        title="Cliquer pour modifier le nom du document"
      >
        {document.name}
      </span>
    )
  );
}

function EditableReferenceName({ document, updateDocument }) {
  const [editing, setEditing] = useState(false);
  const reference = document.referencePath || document.reference || '';
  const parts = reference.split('/');
  const yearPart = parts[parts.length - 2];
  const filePart = parts[parts.length - 1];
  const editablePart = parts.slice(0, -2).join('/');
  const [value, setValue] = useState(editablePart);

  React.useEffect(() => {
    setValue(editablePart);
  }, [editablePart]);

  const handleSave = async () => {
    if (value.trim() && value.trim() !== editablePart) {
      let newReference = value.trim();
      if (newReference) newReference += '/';
      newReference += yearPart + '/' + filePart;
      await updateDocument(document._id || document.id, { reference: newReference });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(editablePart);
    setEditing(false);
  };

  return (
    editing ? (
      <span className="flex items-center gap-1">
        <Input
          type="text"
          value={value}
          autoFocus
          onChange={e => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="w-64 border border-blue-500"
        />
        <span className="font-mono">/{yearPart}/{filePart}</span>
      </span>
    ) : (
      <span
        onClick={() => setEditing(true)}
        className="cursor-pointer underline text-blue-600 hover:text-blue-800"
        title="Cliquer pour modifier le chemin du document (hors année)"
      >
        {editablePart ? editablePart + '/' : ''}
        <span className="font-mono">{yearPart}/{filePart}</span>
      </span>
    )
  );
}
