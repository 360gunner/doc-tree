import Layout from "@/components/layout/Layout";
import CategoryTree from "@/components/archive/CategoryTree";
import DocumentList from "@/components/archive/DocumentList";
import { useArchive } from "@/contexts/ArchiveContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function Archive() {
  const { loading } = useArchive();
  
  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Dossiers</h1>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dossiers</h1>
        <p className="text-muted-foreground">
          Parcourez et gérez vos documents classés par dossier
        </p>
        
        <CategoryTree />
        
        <DocumentList />
      </div>
    </Layout>
  );
}
