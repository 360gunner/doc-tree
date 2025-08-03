import { useEffect, useState } from "react";
import userService from "@/services/userService";
import roleService from "@/services/roleService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import Layout from "@/components/layout/Layout";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    roleService.getRoles().then(data => setRoles(data));
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setForm({ username: "", password: "", role: roles[0]?._id || "" });
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await userService.createUser({ ...form, role: form.role });
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError("Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setForm({ username: u.username, password: "", role: u.roles?.[0]?._id || u.role || roles[0]?._id || "" });
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await userService.updateUser(selectedUser._id, { role: form.role, password: form.password || undefined });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user ${u.username}?`)) return;
    setSaving(true);
    try {
      await userService.deleteUser(u._id);
      fetchUsers();
    } catch (err) {
      setError("Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  if (!user || (user.role !== "admin" && !user.roles?.some(r => r.name === "admin"))) {
    return <Layout><div className="p-6">Access denied. Admins only.</div></Layout>;
  }

  return (
    <Layout>
      <div className="w-full p-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Users & Roles</CardTitle>
            <Button onClick={handleOpenCreate}>Add User</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <table className="w-full mt-4 border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Username</th>
                    <th className="p-2 border">Role</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td className="p-2 border">{u.username}</td>
                      <td className="p-2 border">{Array.isArray(u.roles) ? u.roles.map(r => r.name).join(", ") : u.role}</td>
                      <td className="p-2 border space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenEdit(u)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(u)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Input placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <select className="border rounded px-2 py-1" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Input value={form.username} disabled />
              <Input placeholder="New Password (leave blank to keep)" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <select className="border rounded px-2 py-1" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Roles Section (view only for now) */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc ml-6">
              {roles.map(r => (
                <li key={r._id}><b>{r.name}</b>: {r.description || ''}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
