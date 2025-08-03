import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganigram } from "@/contexts/OrganigramContext";
import { useArchive } from "@/contexts/ArchiveContext";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Folder, File, FolderTree, Archive } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { organigram, progress, missingDocuments, loading, error } = useOrganigram();
  const { categories, documents } = useArchive();
  const { user } = useAuth();

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Bienvenue, {user?.name || user?.username}</h1>
        <p className="text-muted-foreground">
          Ceci est votre tableau de bord de gestion des archives documentaires
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" /> Progression de l'organigramme
              </CardTitle>
              <CardDescription>Suivez l'avancement de vos documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Progress value={progress} />
                <span className="text-sm text-muted-foreground">{progress}% complété</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" /> Documents manquants
              </CardTitle>
              <CardDescription>Documents non remplis dans l'organigramme</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" /> Dossiers
              </CardTitle>
              <CardDescription>Voir et gérer les dossiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories && categories.length > 0 ? (
                  categories.map(cat => (
                    <span key={cat._id || cat.id} className="px-2 py-1 bg-gray-200 rounded text-xs">
                      {cat.name}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">Aucun dossier</span>
                )}
              </div>
              <Link
                to="/archive"
                className="block w-full py-2 text-center bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors mt-4"
              >
                Aller aux dossiers
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
