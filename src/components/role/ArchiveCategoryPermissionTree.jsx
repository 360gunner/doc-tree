import React, { useState } from "react";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";

// Tree node for Archive Category Permissions
function ArchiveCategoryPermissionNode({ node, value, onChange, level = 0, categories }) {
  const [expanded, setExpanded] = useState(false);
  const children = node.children || [];
  const hasChildren = children.length > 0;
  // Find permission for this node
  const perm = value.find(v => (v.category || v.id) === (node._id || node.id))?.permissions || null;

  // Utility to get all descendant category IDs
  function getDescendantIds(node) {
    let ids = [node._id || node.id];
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        ids = ids.concat(getDescendantIds(child));
      }
    }
    return ids;
  }

  // Handler: Set this permission for this node and all descendants
  function setPermissionForNodeAndDescendants(permType) {
    const ids = getDescendantIds(node);
    onChange(ids, permType);
  }

  return (
    <>
      <tr>
        <td style={{ paddingLeft: `${level * 24}px` }}>
          <div className="flex items-center">
            {hasChildren && (
              <button
                type="button"
                className="mr-1"
                aria-label={expanded ? 'Réduire' : 'Développer'}
                onClick={() => setExpanded(e => !e)}
                tabIndex={-1}
              >
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <Folder className="h-4 w-4 text-primary mr-1" />
            <span>{node.name}</span>
          </div>
        </td>
        <td className="text-center">
          <input
            type="checkbox"
            checked={perm === 'view'}
            onChange={() => setPermissionForNodeAndDescendants(perm === 'view' ? null : 'view')}
            disabled={perm === 'crud'}
          />
        </td>
        <td className="text-center">
          <input
            type="checkbox"
            checked={perm === 'crud'}
            onChange={() => setPermissionForNodeAndDescendants(perm === 'crud' ? null : 'crud')}
            disabled={perm === 'view'}
          />
        </td>
      </tr>
      {expanded && hasChildren && node.children.map(child => (
        <ArchiveCategoryPermissionNode
          key={child._id || child.id}
          node={child}
          value={value}
          onChange={onChange}
          level={level + 1}
          categories={categories}
        />
      ))}
    </>
  );
}

// Main component
export default function ArchiveCategoryPermissionTree({
  categories = [],
  value = [],
  onChange
}) {
  if (!categories || categories.length === 0) {
    return <div className="text-gray-400 italic">Aucun dossier disponible.</div>;
  }
  // Only show root categories by default
  const roots = categories.filter(cat => !cat.parent);
  return (
    <table className="w-full border text-sm">
      <thead>
        <tr>
          <th className="border p-1 text-left">Dossier</th>
          <th className="border p-1 text-center">View</th>
          <th className="border p-1 text-center">CRUD</th>
        </tr>
      </thead>
      <tbody>
        {roots.length === 0 && (
          <tr><td colSpan={3} className="text-gray-400 italic">Aucun dossier racine trouvé.</td></tr>
        )}
        {roots.map(node => (
          <ArchiveCategoryPermissionNode
            key={node._id || node.id}
            node={node}
            value={value}
            onChange={onChange}
            categories={categories}
          />
        ))}
      </tbody>
    </table>
  );
}
