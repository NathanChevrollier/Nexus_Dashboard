'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Link as LinkIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { addLibraryItem, updateLibraryItem } from '@/lib/actions/library';
import { useAlert } from '@/components/ui/confirm-provider';
import { searchMedia } from '@/lib/api/anilist';

// Types simplifiés pour l'exemple
const TYPES = [
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'novel', label: 'Roman / LN' },
];

export function AddLibraryItemDialog({ open, onOpenChange, onSuccess, initialData }: any) {
  const [loading, setLoading] = useState(false);
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Form State
  const [formData, setFormData] = useState(() => ({
    title: initialData?.title || '',
    type: initialData?.type || 'manhwa',
    currentProgress: initialData?.currentProgress || 0,
    totalProgress: initialData?.totalProgress || '',
    linkUrl: initialData?.linkUrl || '',
    coverUrl: initialData?.coverUrl || '',
    status: initialData?.status || 'reading'
  }));

  // Reset form when dialog opens/closes or when initialData changes
  useEffect(() => {
    setFormData({
      title: initialData?.title || '',
      type: initialData?.type || 'manhwa',
      currentProgress: initialData?.currentProgress || 0,
      totalProgress: initialData?.totalProgress || '',
      linkUrl: initialData?.linkUrl || '',
      coverUrl: initialData?.coverUrl || '',
      status: initialData?.status || 'reading'
    });
    if (initialData) setActiveTab('manual');
  }, [initialData, open]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (initialData?.id) {
        await updateLibraryItem(initialData.id, formData);
      } else {
        await addLibraryItem(formData);
      }
      onOpenChange(false);
      if (onSuccess) await onSuccess();
      // Reset form
      setFormData({ title: '', type: 'manhwa', currentProgress: 0, totalProgress: '', linkUrl: '', coverUrl: '', status: 'reading' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Simulation recherche API (à connecter à ton proxy Anilist plus tard)
  const handleApiSearch = async () => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      await alert('Saisis au moins 2 caractères pour lancer la recherche');
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchMedia(searchQuery, undefined, 1, 10);
      setSearchResults(results || []);
    } catch (err) {
      console.error(err);
      await alert('La recherche AniList a échoué.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une œuvre</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manuel</TabsTrigger>
            <TabsTrigger value="search">Recherche Auto</TabsTrigger>
          </TabsList>

          <div className="py-4 space-y-4">
            {/* Recherche API (Active le mode hybride) */}
            {activeTab === 'search' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Rechercher (ex: Solo Leveling)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleApiSearch(); }}
                  />
                  <Button onClick={handleApiSearch} variant="secondary">
                    {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Results */}
                <div className="max-h-56 overflow-auto">
                  {searchLoading && <div className="text-sm text-muted-foreground">Chargement...</div>}
                  {!searchLoading && searchResults.length === 0 && <div className="text-sm text-muted-foreground">Aucun résultat</div>}
                  <div className="space-y-2">
                    {searchResults.map(item => (
                      <button
                        key={item.id}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted"
                        onClick={() => {
                          const title = item.title?.english || item.title?.romaji || '';
                          setFormData({
                            ...formData,
                            title,
                            coverUrl: item.coverImage?.large || item.coverImage?.medium || '',
                            linkUrl: item.siteUrl || '',
                          });
                          setActiveTab('manual');
                        }}
                      >
                        <img src={item.coverImage?.medium || item.coverImage?.large} alt="cover" className="w-10 h-14 object-cover rounded" />
                        <div className="text-left">
                          <div className="font-semibold">{item.title?.english || item.title?.romaji}</div>
                          <div className="text-xs text-muted-foreground">{item.format} · {item.status}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Formulaire Principal (Toujours éditable) */}
            <div className="grid gap-2">
              <Label>Titre</Label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Titre de l'œuvre"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={v => setFormData({...formData, type: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={v => setFormData({...formData, status: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading">En cours</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="planned">À lire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Chapitre Actuel</Label>
                <Input 
                  type="number" 
                  value={formData.currentProgress} 
                  onChange={e => setFormData({...formData, currentProgress: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Total (Optionnel)</Label>
                <Input 
                  type="number" 
                  placeholder="?" 
                  value={formData.totalProgress} 
                  onChange={e => setFormData({...formData, totalProgress: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Lien Scan (Ton favori)</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="https://..." 
                  value={formData.linkUrl} 
                  onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Image Couverture (URL)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="https://..." 
                  value={formData.coverUrl} 
                  onChange={e => setFormData({...formData, coverUrl: e.target.value})}
                />
              </div>
            </div>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!formData.title || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}