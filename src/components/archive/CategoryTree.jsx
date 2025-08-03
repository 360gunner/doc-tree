import { useArchive } from "@/contexts/ArchiveContext";
import { Folder, Plus, Pencil, Trash2, ChevronRight, Home } from "lucide-react";
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
import { useState, useEffect } from "react";

// Helper to find a category by ID in the tree
function findCategoryById(categories, id) {
  for (const category of categories) {
    if ((category._id === id || category.id === id)) {
      return category;
    }
    if (category.children) {
      const found = findCategoryById(category.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper to get the breadcrumb path for a category
function getBreadcrumbPath(categories, categoryId, path = []) {
  if (!categoryId) return [];
  
  const category = findCategoryById(categories, categoryId);
  if (!category) return [];
  
  if (category.parent) {
    return [...getBreadcrumbPath(categories, category.parent), category];
  }
  return [category];
}

function CategoryCard({ category, onClick, onEdit, onDelete, onAddSub, canCrud, isCurrent }) {
  return (
    <div 
      className={`flex flex-col items-center p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors ${
        isCurrent ? 'bg-accent' : ''
      }`}
      onClick={onClick}
    >
      <Folder className="h-12 w-12 text-primary mb-2" />
      <div className="text-sm font-medium text-center line-clamp-2">{category.name}</div>
      {category.reference && (
        <div className="text-xs text-muted-foreground mt-1 text-center line-clamp-1">
          {category.reference}
        </div>
      )}
      {canCrud && (
        <div className="mt-2 flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CategoryTree() {
  const { categories, currentCategory, setCurrentCategoryAndFetch, createCategory, updateCategory, deleteCategory } = useArchive();
  const { hasPermission } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newParent, setNewParent] = useState(currentCategory || null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [addSubDialogOpen, setAddSubDialogOpen] = useState(false);
  const [addSubParent, setAddSubParent] = useState(null);
  const [addSubCategoryName, setAddSubCategoryName] = useState("");
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);

  const tree = categories; // categories is already a tree structure from backend

  // Update current folder and breadcrumb when currentCategory changes
  useEffect(() => {
    if (currentCategory) {
      const folder = findCategoryById(categories, currentCategory);
      setCurrentFolder(folder);
      setBreadcrumbPath(getBreadcrumbPath(categories, currentCategory));
    } else {
      setCurrentFolder(null);
      setBreadcrumbPath([]);
    }
  }, [currentCategory, categories]);

  // Get the current folder's children or root categories
  const currentItems = currentFolder ? 
    (Array.isArray(currentFolder.children) ? currentFolder.children : []) : 
    categories;

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const parentValue = currentFolder ? (currentFolder._id || currentFolder.id) : null;
    await createCategory(newCategoryName.toUpperCase(), parentValue);
    setNewCategoryName("");
    setDialogOpen(false);
  };

  const handleAddSubCategory = (parentNode) => {
    setAddSubParent(parentNode._id || parentNode.id);
    setAddSubCategoryName("");
    setAddSubDialogOpen(true);
  };

  // Check if user has permission to CRUD in current folder
  const canCrudInCurrentFolder = () => {
    if (!currentFolder) return hasPermission("admin");
    return currentFolder.permissions === 'crud' || currentFolder.permissions === 'admin';
  };

  const confirmAddSubCategory = async () => {
    if (!addSubCategoryName.trim()) return;
    await createCategory(addSubCategoryName.toUpperCase(), addSubParent);
    setAddSubDialogOpen(false);
  };

  const handleEditCategory = (category) => {
    setEditCategoryId(category._id || category.id);
    setEditCategoryName(category.name);
    setEditDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryName.trim()) return;
    await updateCategory(editCategoryId, editCategoryName.trim().toUpperCase());
    setEditDialogOpen(false);
  };

  const handleDeleteCategory = (category) => {
    setDeleteCategoryId(category._id || category.id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    await deleteCategory(deleteCategoryId);
    setDeleteDialogOpen(false);
  };

  // Handle navigation to a folder
  const navigateToFolder = (folderId) => {
    setCurrentCategoryAndFetch(folderId);
  };

  // Handle navigation to parent folder
  const navigateUp = () => {
    if (breadcrumbPath.length > 0) {
      const parentId = breadcrumbPath[breadcrumbPath.length - 2]?._id || null;
      setCurrentCategoryAndFetch(parentId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2"
          onClick={() => navigateToFolder(null)}
        >
          <Home className="h-4 w-4 mr-1" />
          <span>Racine</span>
        </Button>
        {breadcrumbPath.map((item, index) => (
          <div key={item._id || item.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-foreground"
              onClick={() => navigateToFolder(item._id || item.id)}
            >
              {item.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Current Folder Name and Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {currentFolder ? currentFolder.name : 'Tous les dossiers'}
        </h2>
        {hasPermission("admin") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau dossier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau dossier</DialogTitle>
                <DialogDescription>
                  {currentFolder 
                    ? `Créer un nouveau dossier dans ${currentFolder.name}`
                    : 'Créer un nouveau dossier à la racine'}
                </DialogDescription>
              </DialogHeader>
              <Input
                id="name"
                placeholder="Nom du dossier"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <DialogFooter>
                <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {currentItems.length > 0 ? (
          currentItems.map((item) => {
            const canCrud = item.permissions === 'crud' || item.permissions === 'admin';
            return (
              <CategoryCard
                key={item._id || item.id}
                category={item}
                onClick={() => navigateToFolder(item._id || item.id)}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                canCrud={canCrud}
                isCurrent={currentCategory === (item._id || item.id)}
              />
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Aucun dossier trouvé
          </div>
        )}
      </div>

      {/* Add Subcategory Dialog */}
      <Dialog open={addSubDialogOpen} onOpenChange={setAddSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau sous-dossier</DialogTitle>
            <DialogDescription>
              Entrez le nom du sous-dossier à ajouter dans ce dossier.
            </DialogDescription>
          </DialogHeader>
          <Input
            id="add-sub-category-name"
            placeholder="Nom du sous-dossier"
            value={addSubCategoryName}
            onChange={e => setAddSubCategoryName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={confirmAddSubCategory}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
            <DialogDescription>
              Entrez le nouveau nom du dossier.
            </DialogDescription>
          </DialogHeader>
          <Input
            id="edit-category-name"
            placeholder="Nom du dossier"
            value={editCategoryName}
            onChange={e => setEditCategoryName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleUpdateCategory}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le dossier</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce dossier ? Tous les sous-dossiers et documents associés seront également supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={confirmDeleteCategory}>Supprimer</Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
