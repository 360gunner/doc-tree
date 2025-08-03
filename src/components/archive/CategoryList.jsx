import { useArchive } from "@/contexts/ArchiveContext";
import { Folder, Plus, LayoutGrid, Pencil, Trash2 } from "lucide-react";
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
import { useState } from "react";

export default function CategoryList() {
  const { categories, currentCategory, setCurrentCategoryAndFetch, createCategory, updateCategory, deleteCategory } = useArchive();
  const { hasPermission } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await createCategory(newCategoryName.toUpperCase());
    setNewCategoryName("");
    setDialogOpen(false);
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

  return (
    <>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Dossiers</h2>
          {hasPermission("admin") && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau dossier</DialogTitle>
                  <DialogDescription>
                    Entrez le nom du nouveau dossier.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  id="name"
                  placeholder="Nom du dossier"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Les noms de dossier doivent être en majuscules (par exemple, FINANCE, MISSION)
                </p>
                <DialogFooter>
                  <Button onClick={handleCreateCategory}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-2">
          <div
            className={`cursor-pointer rounded-lg px-4 py-2 transition-colors ${!currentCategory ? 'bg-primary/10' : 'hover:bg-primary/10'}`}
            onClick={() => setCurrentCategoryAndFetch(null)}
          >
            <div className="flex items-center mb-2">
              <LayoutGrid className="h-5 w-5 mr-2 text-primary" />
              <h3 className="font-medium">Tous les dossiers</h3>
            </div>
          </div>

          {categories.map((category) => (
            <div
              key={category._id || category.id}
              className={`cursor-pointer rounded-lg px-4 py-2 transition-colors ${currentCategory === (category._id || category.id) ? 'bg-primary/10' : 'hover:bg-primary/10'}`}
              onClick={() => setCurrentCategoryAndFetch(category._id || category.id)}
            >
              <div className="flex items-center mb-2 justify-between">
                <span className="flex items-center">
                  <Folder className="h-5 w-5 mr-2 text-primary" />
                  <h3 className="font-medium">{category.name}</h3>
                </span>
                {hasPermission("admin") && (
                  <span className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleEditCategory(category); }} title="Renommer">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDeleteCategory(category); }} title="Supprimer">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {category.documentCount} document{category.documentCount !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

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
              Êtes-vous sûr de vouloir supprimer ce dossier ? Tous les documents associés seront également supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={confirmDeleteCategory}>Supprimer</Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
