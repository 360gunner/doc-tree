import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import apiService from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { generateReferencePreview } from "@/utils/referencePreview";

export default function GlobalSettings() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [referenceFormat, setReferenceFormat] = useState({
    sequenceLength: 4,
    categoryMode: 'all',
    separator: '/',
    pattern: '',
  });

  // Preview state
  const [previewCategories, setPreviewCategories] = useState(["Principal", "Sous-dossier"]);
  const [previewName, setPreviewName] = useState("Document");
  const [previewYear, setPreviewYear] = useState(new Date().getFullYear());
  const [previewCode, setPreviewCode] = useState("1");

  // Compute preview reference
  const previewReference = generateReferencePreview({
    ...referenceFormat,
    categories: previewCategories,
    name: previewName,
    year: previewYear,
    code: previewCode,
  });

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await apiService.getGlobalSettings();
        setCompanyName(res.companyName || "");
        setCompanyLogo(res.companyLogo || "");
        setLogoPreview(res.companyLogo || "");
        setReferenceFormat(res.referenceFormat || {
          sequenceLength: 4,
          categoryMode: 'all',
          separator: '/',
          pattern: '',
        });
      } catch (err) {
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let logoUrl = companyLogo;
      if (logoFile) {
        // Upload the logo file and get the URL
        const fileLinks = await apiService.uploadFiles([logoFile]);
        logoUrl = fileLinks[0];
      }
      await apiService.updateGlobalSettings({ companyName, companyLogo: logoUrl, referenceFormat });
      setCompanyLogo(logoUrl);
      setSuccess("Settings updated successfully");
    } catch (err) {
      setError("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="w-full p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Paramètres généraux</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Nom de l'entreprise</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Logo de l'entreprise</label>
          <input type="file" accept="image/*" onChange={handleLogoChange} />
          {logoPreview && (
            <img src={logoPreview} alt="Aperçu du logo" className="h-16 mt-2" />
          )}
        </div>
        <div className="pt-2">
          <label className="block font-medium mb-1">Format de référence</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Longueur de la séquence</label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full border rounded px-2 py-1"
                value={referenceFormat.sequenceLength}
                onChange={e => setReferenceFormat(f => ({ ...f, sequenceLength: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm">Mode des dossiers</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={referenceFormat.categoryMode}
                onChange={e => setReferenceFormat(f => ({ ...f, categoryMode: e.target.value }))}
              >
                <option value="all">Tous les dossiers</option>
                <option value="last">Dernier sous-dossier uniquement</option>
                <option value="root">Dossier racine uniquement</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Séparateur</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                value={referenceFormat.separator}
                onChange={e => setReferenceFormat(f => ({ ...f, separator: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm">Modèle avancé <span className="text-xs text-gray-400">(optionnel)</span></label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                placeholder="ex: {seq}{sep}{cat}"
                value={referenceFormat.pattern}
                onChange={e => setReferenceFormat(f => ({ ...f, pattern: e.target.value }))}
              />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1 space-y-1">
            <div>Modèles disponibles :</div>
            <ul className="list-disc pl-4 space-y-1">
              <li><code>{'{seq}'}</code> - Numéro de séquence (rempli de zéros)</li>
              <li><code>{'{cat}'}</code> - Chemin du dossier (formaté selon le mode)</li>
              <li><code>{'{sep}'}</code> - Caractère séparateur</li>
              <li><code>{'{year}'}</code> - Année en cours</li>
              <li><code>{'{name}'}</code> - Nom du document</li>
            </ul>
            <div>Exemples de modèles :</div>
            <ul className="list-disc pl-4 space-y-1">
              <li><code>{'{seq}{sep}{cat}'}</code> - Format par défaut (ex: 0001/Dossier)</li>
              <li><code>{'DOC-{year}-{seq}'}</code> - Avec préfixe et année (ex: DOC-2023-0001)</li>
              <li><code>{'{cat}/{year}/{seq}'}</code> - Dossiers d'abord avec année (ex: Principal/2023/0001)</li>
              <li><code>{'{name}-{seq}'}</code> - Nom du document avec séquence (ex: Document-0001)</li>
            </ul>
          </div>
          <div className="mt-2 p-2 bg-gray-50 border rounded">
            <div className="font-semibold text-sm mb-1">Aperçu en direct</div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                className="border rounded px-2 py-1 text-xs w-24"
                value={previewCode}
                onChange={e => setPreviewCode(e.target.value)}
                placeholder="Séquence"
                aria-label="Séquence"
              />
              <input
                type="text"
                className="border rounded px-2 py-1 text-xs w-24"
                value={previewYear}
                onChange={e => setPreviewYear(e.target.value)}
                placeholder="Année"
                aria-label="Année"
              />
              <input
                type="text"
                className="border rounded px-2 py-1 text-xs w-24"
                value={previewCategories.join(referenceFormat.separator || "/")}
                onChange={e => setPreviewCategories(e.target.value.split(referenceFormat.separator || "/"))}
                placeholder="Dossiers"
                aria-label="Dossiers"
              />
              <input
                type="text"
                className="border rounded px-2 py-1 text-xs w-24"
                value={previewName}
                onChange={e => setPreviewName(e.target.value)}
                placeholder="Nom"
                aria-label="Nom"
              />
              <span className="ml-2 text-blue-700 font-mono text-xs">{previewReference}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Modifiez les champs ci-dessus pour voir comment la référence apparaîtra pour différentes entrées.</div>
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </Button>
      </form>
    </div>
  );
}
