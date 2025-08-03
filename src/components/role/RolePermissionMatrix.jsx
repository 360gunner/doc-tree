import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import ArchiveCategoryPermissionTree from "./ArchiveCategoryPermissionTree";

/**
 * PermissionMatrix
 * Reusable for both Organigram and Archive Categories
 * @param {Object[]} items - Array of { _id, name, children? }
 * @param {Object[]} value - Array of { id, permissions }
 * @param {Function} onChange - Callback(newValue)
 * @param {string} idKey - Key to use as id ('node' or 'category')
 * @param {string} label - Section label
 */
export default function RolePermissionMatrix({ items = [], value = [], onChange, idKey, label }) {
  // value: [{ node/category, permissions }]
  const getPerm = id => {
    const found = value.find(v => v[idKey] === id || v[idKey]?._id === id);
    return found ? found.permissions : null;
  };

  // Utility: collect all descendant node IDs recursively
  const collectDescendantIds = (item) => {
    let ids = [item._id];
    if (item.children && item.children.length > 0) {
      item.children.forEach(child => {
        ids = ids.concat(collectDescendantIds(child));
      });
    }
    return ids;
  };

  // Utility: check if a node is a descendant of any checked parent
  const isDescendantChecked = (item, checkedIds) => {
    if (!item.parent) return false;
    if (checkedIds.has(item.parent)) return true;
    // Find parent node in items (flattened)
    const findParent = (nodes, parentId) => {
      for (const n of nodes) {
        if (n._id === parentId) return n;
        if (n.children) {
          const found = findParent(n.children, parentId);
          if (found) return found;
        }
      }
      return null;
    };
    const parentNode = findParent(items, item.parent);
    if (parentNode) return isDescendantChecked(parentNode, checkedIds);
    return false;
  };

  // When a parent is checked, check all its descendants and gray them out
  const handleCheck = (id, perm, item) => {
    let updated = value.filter(v => {
      // Remove this node and all descendants
      if ((v[idKey]?._id || v[idKey]) === id) return false;
      if (item && item.children && collectDescendantIds(item).includes(v[idKey]?._id || v[idKey])) return false;
      return true;
    });
    if (perm) {
      // Add this node and all descendants as checked with the same permission
      updated.push({ [idKey]: id, permissions: perm });
      if (item && item.children && item.children.length > 0) {
        const allDescendants = collectDescendantIds(item).filter(descId => descId !== id);
        allDescendants.forEach(descId => {
          updated.push({ [idKey]: descId, permissions: perm });
        });
      }
    }
    onChange(updated);
  };

  // Build a set of all checked parent IDs for fast descendant lookup
  const checkedIds = new Set((value || []).map(v => v[idKey]?._id || v[idKey]));

  // Recursive row renderer for tree
  const renderRows = (nodes, depth = 0, parentChecked = false) => {
    return nodes.map(item => {
      const perm = getPerm(item._id);
      const isParentChecked = parentChecked || (item.parent && checkedIds.has(item.parent));
      const isGrayed = isParentChecked;
      return [
        <tr key={item._id}>
          <td className="border p-1" style={{ paddingLeft: `${depth * 24}px`, color: isGrayed ? '#888' : undefined }}>
            {item.name}
          </td>
          <td className="border p-1 text-center">
            <Checkbox checked={perm === "view"}
              onCheckedChange={checked => handleCheck(item._id, checked ? "view" : null, item)}
              disabled={isGrayed || perm === "crud"}
            />
          </td>
          <td className="border p-1 text-center">
            <Checkbox checked={perm === "crud"}
              onCheckedChange={checked => handleCheck(item._id, checked ? "crud" : perm === "view" ? null : null, item)}
              disabled={isGrayed}
            />
          </td>
        </tr>,
        item.children && item.children.length > 0 ? renderRows(item.children, depth + 1, isParentChecked || perm) : null
      ];
    });
  };

  return (
    <div className="mb-4">
      <div className="font-semibold mb-1">{label}</div>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="border p-1">Name</th>
            <th className="border p-1">View</th>
            <th className="border p-1">CRUD</th>
          </tr>
        </thead>
        <tbody>
          {renderRows(items || [])}
        </tbody>
      </table>
    </div>
  );
}

// Render Archive Category Permissions as a tree with expand/collapse, only showing parents by default
export function ArchiveCategoryPermissions({
  categories,
  value,
  onChange
}) {
  return (
    <div>
      <div className="font-semibold mb-1">Archive Categories Permissions</div>
      <ArchiveCategoryPermissionTree
        categories={categories}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
