'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Image as ImageIcon, Loader2, CalendarClock, BookOpen } from 'lucide-react';
import { addLibraryItem, updateLibraryItem } from '@/lib/actions/library';
import { searchMedia } from '@/lib/api/anilist';

const TYPES = [
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'novel', label: 'Roman / LN' },
  { value: 'anime', label: 'Anime' }, // Ajouté pour le calendrier
];

const STATUSES = [
  { value: 'reading', label: 'En cours de lecture' },
  { value: 'plan_to_read', label: 'À lire (Planifié)' },
  { value: 'completed', label: 'Terminé / Déjà lu' },
  { value: 'paused', label: 'En pause' },
  { value: 'dropped', label: 'Abandonné' },
];

export function AddLibraryItemDialog({ open, onOpenChange, onSuccess, initialData }: any) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'manhwa',
    status: 'reading',
    currentProgress: 0,
    totalProgress: '',
    linkUrl: '',
    coverUrl: '',
    hasSchedule: false,
    scheduleType: 'weekly',
    scheduleDay: 'monday'
  });

  // Init Form
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        type: initialData.type || 'manhwa',
        status: initialData.status || 'reading',
        currentProgress: initialData.currentProgress || 0,
        totalProgress: initialData.totalProgress || '',
        linkUrl: initialData.linkUrl || '',
        coverUrl: initialData.coverUrl || '',
        hasSchedule: !!initialData.scheduleType,
        scheduleType: initialData.scheduleType || 'weekly',
        scheduleDay: initialData.scheduleDay || 'monday',
      });
      setActiveTab('manual');
    } else {
      setFormData({
        title: '', type: 'manhwa', status: 'reading',
        currentProgress: 0, totalProgress: '', linkUrl: '', coverUrl: '',
        hasSchedule: false, scheduleType: 'weekly', scheduleDay: 'monday'
      });
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [initialData, open]);

  // --- RECHERCHE AUTO AVEC DEBOUNCE ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 3 && activeTab === 'search') {
        handleApiSearch();
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  const handleApiSearch = async () => {
    setSearchLoading(true);
    try {
      const results = await searchMedia(searchQuery, undefined, 1, 10);
      setSearchResults(results || []);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line no-alert
      alert('La recherche AniList a échoué. Vérifie ta connexion ou le proxy.');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = (item: any) => {
    // Détection basique du type si possible, sinon défaut
    const typeMap: any = { 'MANGA': 'manga', 'NOVEL': 'novel', 'ANIME': 'anime' };
    const detectedType = typeMap[item.format] || 'manhwa';

    setFormData(prev => ({
      ...prev,
      title: item.title?.userPreferred || item.title?.english || item.title?.romaji || 'Titre inconnu',
      coverUrl: item.coverImage?.large || item.coverImage?.medium || '',
      linkUrl: item.siteUrl || '',
      type: item.type === 'ANIME' ? 'anime' : detectedType,
    }));
    setActiveTab('manual');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        currentProgress: parseInt(String(formData.currentProgress)) || 0,
        totalProgress: formData.totalProgress === '' || formData.totalProgress === null
          ? null
          : parseInt(String(formData.totalProgress)),
        scheduleType: formData.hasSchedule ? formData.scheduleType : null,
        scheduleDay: formData.hasSchedule ? formData.scheduleDay : null,
      };

      if (initialData?.id) {
        await updateLibraryItem(initialData.id, dataToSave);
      } else {
        await addLibraryItem(dataToSave);
      }
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Modifier l\'œuvre' : 'Ajouter une lecture'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
            <TabsTrigger value="manual">Saisie Manuelle</TabsTrigger>
            <TabsTrigger value="search">Recherche Auto</TabsTrigger>
          </TabsList>

          {/* ONGLET RECHERCHE (Inchangé visuellement, logique conservée) */}
          <TabsContent value="search" className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9"
                placeholder="Titre du manga/webtoon/anime..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md bg-muted/10 p-2">
              {searchLoading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">Recherche en cours...</span>
                </div>
              )}
              
              {!searchLoading && searchResults.length === 0 && searchQuery.length > 2 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <BookOpen className="h-8 w-8 mb-2 opacity-20" />
                  <span className="text-sm">Aucun résultat trouvé</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {searchResults.map((res: any) => (
                  <div 
                    key={res.id} 
                    onClick={() => selectSearchResult(res)} 
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 cursor-pointer transition-all group"
                  >
                    <div className="h-16 w-12 bg-muted rounded shrink-0 overflow-hidden relative">
                      {res.coverImage?.large || res.coverImage?.medium ? (
                        <img 
                          src={res.coverImage.large || res.coverImage.medium} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <ImageIcon className="h-4 w-4 opacity-30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-sm truncate">{res.title?.userPreferred || res.title?.english}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                         <span className="uppercase font-bold text-[10px] bg-muted px-1 rounded">{res.format || 'N/A'}</span>
                         <span>• Clique pour sélectionner</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ONGLET MANUEL (Amélioré avec Statut et Type Anime) */}
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Label>Titre</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Nom de l'œuvre..." />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* NOUVEAU : SELECTEUR DE STATUT */}
            <div className="space-y-2">
                <Label>Statut de lecture</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Progression (Chapitre / Épisode)</Label>
                <Input type="number" value={formData.currentProgress} onChange={e => setFormData({...formData, currentProgress: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Total (Optionnel)</Label>
                <Input type="number" placeholder="?" value={formData.totalProgress} onChange={e => setFormData({...formData, totalProgress: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lien (Scan / Stream)</Label>
              <Input placeholder="https://..." value={formData.linkUrl} onChange={e => setFormData({...formData, linkUrl: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Image de couverture (URL)</Label>
              <div className="flex gap-3">
                <Input className="flex-1" placeholder="https://..." value={formData.coverUrl} onChange={e => setFormData({...formData, coverUrl: e.target.value})} />
                {formData.coverUrl && (
                  <div className="h-10 w-10 shrink-0 rounded border bg-muted overflow-hidden">
                    <img src={formData.coverUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* PLANIFICATION */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <Label htmlFor="schedule-mode" className="cursor-pointer font-medium">Suivi de sortie (Calendrier)</Label>
                </div>
                <Switch id="schedule-mode" checked={formData.hasSchedule} onCheckedChange={v => setFormData({...formData, hasSchedule: v})} />
              </div>

              {formData.hasSchedule && (
                <div className="grid grid-cols-2 gap-3 pt-1 animate-in slide-in-from-top-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fréquence</Label>
                    <Select value={formData.scheduleType} onValueChange={v => setFormData({...formData, scheduleType: v})}>
                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="biweekly">Une semaine sur deux</SelectItem>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Jour de sortie</Label>
                    <Select value={formData.scheduleDay} onValueChange={v => setFormData({...formData, scheduleDay: v})}>
                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Lundi</SelectItem>
                        <SelectItem value="tuesday">Mardi</SelectItem>
                        <SelectItem value="wednesday">Mercredi</SelectItem>
                        <SelectItem value="thursday">Jeudi</SelectItem>
                        <SelectItem value="friday">Vendredi</SelectItem>
                        <SelectItem value="saturday">Samedi</SelectItem>
                        <SelectItem value="sunday">Dimanche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!formData.title || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}