import { useEffect, useState } from "react";
import roleService from "@/services/roleService";
import organigramService from "@/services/organigramService";
import categoryService from "@/services/categoryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import RolePermissionMatrix from "@/components/role/RolePermissionMatrix";
import { ArchiveCategoryPermissions } from "@/components/role/RolePermissionMatrix";
import Layout from "@/components/layout/Layout";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", archiveCategories: [], organigramNodes: [] });
  const [saving, setSaving] = useState(false);
  const [organigramNodes, setOrganigramNodes] = useState([]);
  const [categories, setCategories] = useState([]);

  // Utility to convert flat categories array to tree
  function buildCategoryTree(categories) {
    const idMap = {};
    categories.forEach(cat => {
      idMap[cat._id] = { ...cat, children: [] };
    });
    const tree = [];
    categories.forEach(cat => {
      if (cat.parent) {
        idMap[cat.parent]?.children.push(idMap[cat._id]);
      } else {
        tree.push(idMap[cat._id]);
      }
    });
    return tree;
  }

  useEffect(() => {
    fetchRoles();
    organigramService.getTree().then(setOrganigramNodes); // Use tree endpoint for hierarchical nodes
    categoryService.getCategories().then(raw => setCategories(buildCategoryTree(raw)));
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (err) {
      setError("Échec du chargement des rôles");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setForm({ name: "", description: "", archiveCategories: [], organigramNodes: [] });
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await roleService.createRole(form);
      setCreateDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setError("Échec de la création du rôle");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (role) => {
    setSelectedRole(role);
    setForm({
      name: role.name,
      description: role.description,
      archiveCategories: role.archiveCategories?.map(c => ({ category: c.category?._id || c.category, permissions: c.permissions })) || [],
      organigramNodes: role.organigramNodes?.map(n => ({ node: n.node?._id || n.node, permissions: n.permissions })) || [],
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      // Filter out any entries with null/undefined category or node values
      const filteredForm = {
        ...form,
        archiveCategories: form.archiveCategories.filter(cat => cat?.category),
        organigramNodes: form.organigramNodes.filter(node => node?.node)
      };
      
      await roleService.updateRole(selectedRole._id, filteredForm);
      setEditDialogOpen(false);
      fetchRoles();
    } catch (err) {
      console.error('Update role error:', err);
      setError("Échec de la mise à jour du rôle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Supprimer le rôle ${role.name} ?`)) return;
    setSaving(true);
    try {
      await roleService.deleteRole(role._id);
      fetchRoles();
    } catch (err) {
      setError("Échec de la suppression du rôle");
    } finally {
      setSaving(false);
    }
  };

  // Permission matrix handlers
  const setArchiveCategories = (v) => setForm(f => ({ ...f, archiveCategories: v }));
  const handleSetOrganigramNodes = (v) => setForm(f => ({ ...f, organigramNodes: v }));

  return (
    <Layout>
      <div className="w-full p-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Gestion des rôles</CardTitle>
            <Button onClick={handleOpenCreate}>Ajouter un rôle</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Chargement en cours...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <table className="w-full mt-4 border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Nom</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role._id}>
                      <td className="p-2 border">{role.name}</td>
                      <td className="p-2 border">{role.description}</td>
                      <td className="p-2 border space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenEdit(role)}>Modifier</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(role)}>Supprimer</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Create Role Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <DialogHeader>
              <DialogTitle>Ajouter un rôle</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Input placeholder="Role Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <RolePermissionMatrix
                items={organigramNodes || []}
                value={form.organigramNodes}
                onChange={handleSetOrganigramNodes}
                idKey="node"
                label="Permissions d'organigramme"
              />
              <ArchiveCategoryPermissions
                categories={categories || []}
                value={form.archiveCategories}
                onChange={(catIds, perm) => {
                  setForm(f => {
                    let updated = (f.archiveCategories || []).filter(c => !catIds.includes(c.category));
                    if (perm) {
                      updated = [
                        ...updated,
                        ...catIds.map(id => ({ category: id, permissions: perm }))
                      ];
                    }
                    return { ...f, archiveCategories: updated };
                  });
                }}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Enregistrement..." : "Créer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <DialogHeader>
              <DialogTitle>Modifier le rôle</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Input placeholder="Role Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <RolePermissionMatrix
                items={organigramNodes || []}
                value={form.organigramNodes}
                onChange={handleSetOrganigramNodes}
                idKey="node"
                label="Permissions d'organigramme"
              />
              <ArchiveCategoryPermissions
                categories={categories || []}
                value={form.archiveCategories}
                onChange={(catIds, perm) => {
                  setForm(f => {
                    let updated = (f.archiveCategories || []).filter(c => !catIds.includes(c.category));
                    if (perm) {
                      updated = [
                        ...updated,
                        ...catIds.map(id => ({ category: id, permissions: perm }))
                      ];
                    }
                    return { ...f, archiveCategories: updated };
                  });
                }}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleEdit} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
