
import { useOrganigram } from "@/contexts/OrganigramContext";
import { File, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MissingDocumentsList() {
  const { organigram, getMissingDocuments } = useOrganigram();
  
  if (!organigram) {
    return null;
  }
  
  const missingDocuments = getMissingDocuments(organigram);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Missing Documents
        </CardTitle>
        <CardDescription>
          These documents need to be uploaded to complete the organigram
        </CardDescription>
      </CardHeader>
      <CardContent>
        {missingDocuments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No missing documents. Everything is uploaded!
          </div>
        ) : (
          <div className="space-y-2">
            {missingDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center p-2 border rounded-md">
                <File className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{doc.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
