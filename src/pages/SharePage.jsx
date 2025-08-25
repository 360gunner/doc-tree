import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiService from '@/services/apiService';

const SharePage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const fetchData = async (pwd) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      // Try organigram first
      const node = await apiService.organigram.getPublicByToken(token, pwd);
      setData({ type: 'organigram', payload: node });
    } catch (e1) {
      try {
        // Fallback to document (dossier)
        const doc = await apiService.archive.getPublicDocument(token, pwd);
        setData({ type: 'document', payload: doc });
      } catch (e2) {
        const status = e2?.response?.status;
        let msg = 'Lien invalide ou expiré.';
        if (status === 401 || status === 403) msg = 'Mot de passe requis ou incorrect.';
        else if (status === 410) msg = 'Lien expiré.';
        else if (status === 404) msg = 'Lien introuvable.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetchData(password);
  };

  const renderDownload = () => {
    if (!data) return null;
    let files = [];
    if (data.type === 'organigram') {
      const node = data.payload || {};
      if (Array.isArray(node.fileUrls)) files = files.concat(node.fileUrls.filter(Boolean));
      if (Array.isArray(node.files)) files = files.concat(node.files.map(f => (typeof f === 'string' ? f : f?.url)).filter(Boolean));
      if (node.downloadUrl) files.push(node.downloadUrl);
      if (node.fileUrl) files.push(node.fileUrl);
      if (node.file) files.push(node.file);
    } else if (data.type === 'document') {
      const doc = data.payload || {};
      if (Array.isArray(doc.fileUrls)) files = files.concat(doc.fileUrls.filter(Boolean));
      if (Array.isArray(doc.files)) files = files.concat(doc.files.map(f => (typeof f === 'string' ? f : f?.url)).filter(Boolean));
      if (Array.isArray(doc.urls)) files = files.concat(doc.urls.filter(Boolean));
      if (doc.downloadUrl) files.push(doc.downloadUrl);
      if (doc.fileUrl) files.push(doc.fileUrl);
      if (doc.file) files.push(doc.file);
    }
    files = Array.from(new Set(files));
    if (files.length === 0) {
      return (
        <div className="mt-4 text-sm text-gray-600">
          Lien valide, mais aucun fichier téléchargeable n'est disponible.
        </div>
      );
    }
    return (
      <div className="mt-4 space-y-2">
        {files.map((f, i) => (
          <div key={i}>
            <a href={f} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Télécharger fichier {i + 1}</a>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold">Lien de partage</h1>
        <p className="text-sm text-gray-600 mt-1">Entrez le mot de passe si requis pour accéder au contenu.</p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Laissez vide si non requis"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Vérification…' : 'Accéder'}</Button>
        </form>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        {data && (
          <div className="mt-6">
            {renderDownload()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharePage;
