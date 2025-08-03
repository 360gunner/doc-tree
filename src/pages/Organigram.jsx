import Layout from "@/components/layout/Layout";
import { useOrganigram } from "@/contexts/OrganigramContext";
import DocumentNode from "@/components/organigram/DocumentNode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import BilelOrganigram from "./BilelOrganigram";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, LayoutGrid, List } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from 'react';
import apiService from "@/services/apiService";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Organigram() {
  const { organigram, progress, missingDocuments, loading, error, fetchOrganigramTree } = useOrganigram();
  const { hasPermission } = useAuth();
  const [rootName, setRootName] = useState("");
  const [rootDialogOpen, setRootDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'list'

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Mon organigramme</h1>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Mon organigramme</h1>
          <div className="text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  // PATCH: Fix root node logic
  // If the backend returns a single node with parent null and children is an array (even if empty), treat it as the root
  const isTrulyEmpty = !organigram || Array.isArray(organigram) && organigram.length === 0;
  const isSingleRoot = organigram && organigram._id && organigram.parent === null;

  if (isTrulyEmpty) {
    // Tree is empty: show add root node dialog for admin
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Mon organigramme</h1>
          {hasPermission("admin") ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="mb-4 text-lg text-muted-foreground">L'organigramme est vide. Créez la racine pour commencer.</p>
              <button
                className="bg-primary text-white px-4 py-2 rounded font-semibold"
                onClick={() => setRootDialogOpen(true)}
              >
                Créer la racine
              </button>
              {rootDialogOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                  <div className="bg-white p-8 rounded shadow-lg flex flex-col items-center">
                    <h2 className="text-xl font-bold mb-2">Créer la racine</h2>
                    <input
                      className="border rounded px-2 py-1 mb-4"
                      placeholder="Nom de la racine"
                      value={rootName}
                      onChange={e => setRootName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="bg-primary text-white px-4 py-2 rounded font-semibold"
                        onClick={async () => {
                          if (!rootName.trim()) return;
                          await apiService.organigram.createNode({ name: rootName });
                          setRootDialogOpen(false);
                          setRootName("");
                          fetchOrganigramTree();
                        }}
                      >Créer</button>
                      <button
                        className="bg-gray-200 px-4 py-2 rounded font-semibold"
                        onClick={() => setRootDialogOpen(false)}
                      >Annuler</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">L'organigramme est vide.</div>
          )}
        </div>
      </Layout>
    );
  }

  // If we have a single root node, show the tree
  // (this is the normal case, even if children is empty)
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Mon organigramme</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Vue :</span>
            <div className="inline-flex items-center rounded-md bg-muted p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={viewMode === 'tree'}
                    onPressedChange={() => setViewMode('tree')}
                    className="px-3"
                    aria-label="Vue arborescente"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Vue arborescente</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={viewMode === 'list'}
                    onPressedChange={() => setViewMode('list')}
                    className="px-3"
                    aria-label="Vue liste"
                  >
                    <List className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Vue liste</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Progression globale</CardTitle>
                <CardDescription>Pourcentage global d'achèvement</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progress} />
                <span className="text-sm text-muted-foreground">{progress}% complété</span>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Structure des documents</CardTitle>
                <CardDescription>Organisez et suivez vos documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={viewMode === 'tree' ? 'document-tree' : ''}>
                  {organigram && (
                    viewMode === 'tree'
                      ? <BilelOrganigram data={organigram} />
                      : <DocumentNode node={organigram} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" /> Documents manquants
                </CardTitle>
                <CardDescription>Ces documents doivent être téléchargés pour compléter l'organigramme</CardDescription>
              </CardHeader>
              <CardContent>
                {missingDocuments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Aucun document manquant. Tout est téléchargé !
                  </div>
                ) : (
                  <ul className="list-disc pl-5">
                    {missingDocuments.map(doc => (
                      <li key={doc.id || doc._id}>{doc.name}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
