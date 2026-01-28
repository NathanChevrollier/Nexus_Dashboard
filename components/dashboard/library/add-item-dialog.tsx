'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Image as ImageIcon, Loader2, CalendarClock, BookOpen, Link2, Sparkles, Check, ArrowRight, Edit3, ExternalLink, RotateCcw, AlertCircle } from 'lucide-react';
import { addLibraryItem, updateLibraryItem } from '@/lib/actions/library';
import { searchMedia } from '@/lib/api/anilist';
import { detectSchedule, formatScheduleInfo, type ScheduleInfo } from '@/lib/api/schedule-detection';
import { Badge } from '@/components/ui/badge';

/**
 * Mappage des formats AniList vers nos types détectés
 * Basé sur l'audit complet des formats AniList
 * Source: https://anilist.co/graphql
 */
const ANILIST_FORMAT_MAP: Record<string, string> = {
  'ANIME': 'anime',          // Série anime TV
  'TV_SHORT': 'anime',       // Court métrage TV
  'MOVIE': 'anime',          // Film anime
  'SPECIAL': 'anime',        // OVA/ONA
  'MANGA': 'manga',          // Manga
  'ONE_SHOT': 'manga',       // One-shot
  'NOVEL': 'novel',          // Light novel
  'MANHWA': 'manhwa',        // Manga coréen (rare dans AniList)
  'MANHUA': 'manhua',        // Manga chinois (rare dans AniList)
};

const TYPES = [
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'novel', label: 'Roman / LN' },
  { value: 'anime', label: 'Anime' },
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
  
  // Stepper: 'search' | 'detect' | 'adjust' | 'manual'
  const [currentStep, setCurrentStep] = useState<'search' | 'detect' | 'adjust' | 'manual'>('search');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'manhwa',
    status: 'reading',
    currentProgress: 0,
    totalProgress: '',
    linkUrl: '',
    additionalUrl: '',
    coverUrl: '',
    hasSchedule: false,
    scheduleType: 'weekly',
    scheduleDay: 'monday',
    anilistId: null as number | null,
    tmdbId: null as number | null,
  });

  // Auto-detect schedule state
  const [scheduleDetecting, setScheduleDetecting] = useState(false);
  const [detectedSchedule, setDetectedSchedule] = useState<ScheduleInfo | null>(null);
  const [detectionComplete, setDetectionComplete] = useState(false);

  // Duplicate detection state
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

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
        additionalUrl: initialData.additionalUrl || '',
        coverUrl: initialData.coverUrl || '',
        hasSchedule: !!initialData.scheduleType,
        scheduleType: initialData.scheduleType || 'weekly',
        scheduleDay: initialData.scheduleDay || 'monday',
        anilistId: initialData.anilistId || null,
        tmdbId: initialData.tmdbId || null,
      });
      setCurrentStep('detect');
      
      // Déclencher l'auto-détection pour les initialData (depuis widget anime calendar par exemple)
      setTimeout(() => {
        handleAutoDetectSchedule(initialData.title || '', initialData.type || 'anime');
      }, 300);
    } else {
      setFormData({
        title: '', type: 'manhwa', status: 'reading',
        currentProgress: 0, totalProgress: '', linkUrl: '', additionalUrl: '', coverUrl: '',
        hasSchedule: false, scheduleType: 'weekly', scheduleDay: 'monday',
        anilistId: null, tmdbId: null,
      });
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResult(null);
      setDetectedSchedule(null);
      setDetectionComplete(false);
      setCurrentStep('search');
    }
  }, [initialData, open]);

  // --- RECHERCHE AUTO AVEC DEBOUNCE ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 3 && currentStep === 'search') {
        handleApiSearch();
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentStep]);

  const handleApiSearch = async () => {
    setSearchLoading(true);
    try {
      const results = await searchMedia(searchQuery, undefined, 1, 10);
      setSearchResults(results || []);
    } catch (e) {
      console.error(e);
      alert('La recherche AniList a échoué. Vérifie ta connexion ou le proxy.');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = (item: any) => {
    // Mapper le format AniList vers nos types - Utiliser la constante validée
    const anilistFormat = item.format as keyof typeof ANILIST_FORMAT_MAP;
    const detectedType = ANILIST_FORMAT_MAP[anilistFormat] || 'anime';
    
    // Fallback strictement en anime si format inconnu
    if (!ANILIST_FORMAT_MAP[anilistFormat]) {
      console.warn('[SELECT-RESULT] Unknown AniList format:', item.format, '- using anime as default');
    }

    const finalTitle = item.title?.userPreferred || item.title?.english || item.title?.romaji || 'Titre inconnu';

    setSelectedResult(item);
    setFormData(prev => ({
      ...prev,
      title: finalTitle,
      coverUrl: item.coverImage?.large || item.coverImage?.medium || '',
      type: detectedType,
      anilistId: item.id || null,
    }));

    setCurrentStep('detect');

    setTimeout(() => {
      handleAutoDetectSchedule(finalTitle, detectedType);
    }, 300);
  };

  const handleAutoDetectSchedule = async (titleOverride?: string, typeOverride?: string) => {
    const title = titleOverride || formData.title;
    const type = typeOverride || formData.type;

    const titleStr = String(title || '').trim();
    if (!titleStr || titleStr.length < 2) {
      setDetectionComplete(true);
      return;
    }

    setScheduleDetecting(true);
    setDetectedSchedule(null);
    setDetectionComplete(false);

    try {
      const result = await detectSchedule(titleStr, type);
      setDetectedSchedule(result);
      setDetectionComplete(true);

      if (result && result.scheduleDay && result.scheduleType) {
        setFormData(prev => ({
          ...prev,
          hasSchedule: true,
          scheduleType: result.scheduleType as any,
          scheduleDay: result.scheduleDay as any,
          type: result.detectedType || prev.type,
          status: result.detectedStatus || prev.status,
          totalProgress: result.totalProgress?.toString() || prev.totalProgress,
          anilistId: result.source === 'anilist' ? result.externalId || null : prev.anilistId,
          tmdbId: result.source === 'tmdb' ? result.externalId || null : prev.tmdbId,
          coverUrl: prev.coverUrl || result.coverUrl || prev.coverUrl,
          linkUrl: result.streamingLinks?.crunchyroll || result.streamingLinks?.voiranime || prev.linkUrl,
        }));
      } else if (result) {
        setFormData(prev => ({
          ...prev,
          type: result.detectedType || prev.type,
          status: result.detectedStatus || prev.status,
          totalProgress: result.totalProgress?.toString() || prev.totalProgress,
          anilistId: result.source === 'anilist' ? result.externalId || null : prev.anilistId,
          tmdbId: result.source === 'tmdb' ? result.externalId || null : prev.tmdbId,
          coverUrl: prev.coverUrl || result.coverUrl || prev.coverUrl,
          linkUrl: result.streamingLinks?.crunchyroll || result.streamingLinks?.voiranime || prev.linkUrl,
        }));
      }
    } catch (error) {
      console.error('Schedule detection failed:', error);
      setDetectionComplete(true);
    } finally {
      setScheduleDetecting(false);
    }
  };

  const checkForDuplicates = async (title: string, type: string) => {
    if (!title?.trim() || !type || initialData?.id) return;
    
    setCheckingDuplicate(true);
    try {
      const response = await fetch('/api/library/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), type })
      });
      
      if (!response.ok) {
        setIsDuplicate(false);
        return;
      }
      
      const { isDuplicate } = await response.json();
      setIsDuplicate(isDuplicate);
    } catch (error) {
      console.error('Duplicate check failed:', error);
      setIsDuplicate(false);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  useEffect(() => {
    if (!initialData?.id) {
      const debounceTimer = setTimeout(() => {
        checkForDuplicates(formData.title, formData.type);
      }, 500);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [formData.title, formData.type, initialData?.id]);

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
        additionalUrl: formData.additionalUrl ? formData.additionalUrl : null,
        anilistId: formData.anilistId,
        tmdbId: formData.tmdbId,
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
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>{initialData ? 'Modifier l\'œuvre' : 'Ajouter une lecture'}</DialogTitle>
          
          {/* Stepper visuel */}
          {!initialData && (
            <div className="flex items-center gap-2 mt-4 text-sm">
              <div className={`flex items-center gap-2 ${currentStep === 'search' ? 'text-primary font-semibold' : currentStep === 'detect' || currentStep === 'adjust' ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === 'search' ? 'bg-primary text-primary-foreground' : currentStep === 'detect' || currentStep === 'adjust' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                  {currentStep === 'detect' || currentStep === 'adjust' ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className="hidden sm:inline">Recherche</span>
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
              
              <div className={`flex items-center gap-2 ${currentStep === 'detect' ? 'text-primary font-semibold' : currentStep === 'adjust' ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === 'detect' ? 'bg-primary text-primary-foreground' : currentStep === 'adjust' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                  {currentStep === 'adjust' ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <span className="hidden sm:inline">Détection</span>
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
              
              <div className={`flex items-center gap-2 ${currentStep === 'adjust' ? 'text-primary font-semibold' : 'text-muted-foreground/40'}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${currentStep === 'adjust' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  3
                </div>
                <span className="hidden sm:inline">Validation</span>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-1">
          {/* ÉTAPE 1: RECHERCHE */}
          {currentStep === 'search' && (
            <div className="space-y-4 pb-4">
              <div className="text-sm text-muted-foreground px-1">
                💡 Recherchez sur AniList pour bénéficier de l'auto-détection des horaires et liens de streaming
              </div>
              
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
              
              <div className="min-h-[350px] max-h-[450px] overflow-y-auto border rounded-md bg-muted/5 p-2">
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

                {!searchLoading && searchQuery.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-20" />
                    <span className="text-sm">Tapez au moins 3 caractères</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {searchResults.map((res: any) => (
                    <button 
                      key={res.id} 
                      onClick={() => selectSearchResult(res)} 
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 cursor-pointer transition-all group text-left"
                    >
                      <div className="h-20 w-14 bg-muted rounded shrink-0 overflow-hidden relative">
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
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{res.title?.userPreferred || res.title?.english}</p>
                        <div className="flex gap-2 text-xs mt-1.5">
                           <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{res.format || 'N/A'}</Badge>
                           {res.status && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{res.status}</Badge>}
                        </div>
                        {res.genres && res.genres.length > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-1 truncate">
                            {res.genres.slice(0, 3).join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t pt-3">
                <span>Ou</span>
                <button className="underline hover:text-primary font-medium" onClick={() => setCurrentStep('manual')}>
                  saisir manuellement sans auto-détection
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2: DÉTECTION */}
          {currentStep === 'detect' && (
            <div className="space-y-6 pb-4">
              {/* Preview du résultat sélectionné */}
              {selectedResult && (
                <div className="flex gap-4 p-4 rounded-lg border bg-card">
                  <div className="h-32 w-24 bg-muted rounded shrink-0 overflow-hidden">
                    {formData.coverUrl && (
                      <img src={formData.coverUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{formData.title}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge>{formData.type}</Badge>
                      <Badge variant="outline">{selectedResult.format}</Badge>
                    </div>
                    {selectedResult.genres && (
                      <p className="text-xs text-muted-foreground mt-2">{selectedResult.genres.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* État de la détection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Auto-détection
                  </h3>
                  {detectionComplete && !scheduleDetecting && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoDetectSchedule()}
                      className="gap-1.5 h-8"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Re-détecter
                    </Button>
                  )}
                </div>

                {scheduleDetecting && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Détection en cours</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Recherche des horaires de sortie et liens de streaming sur Crunchyroll, VoirAnime...
                      </p>
                    </div>
                  </div>
                )}

                {detectionComplete && !scheduleDetecting && (
                  <div className="space-y-4">
                    {detectedSchedule ? (
                      <>
                        {/* Résumé de la détection */}
                        <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-green-700 dark:text-green-400">Détection réussie !</span>
                              </div>
                              <div className="text-sm space-y-1 ml-7">
                                <div><span className="text-muted-foreground">Type:</span> <Badge variant="secondary" className="ml-2">{detectedSchedule.detectedType || formData.type}</Badge></div>
                                <div><span className="text-muted-foreground">Statut:</span> <Badge variant="outline" className="ml-2">{STATUSES.find(s => s.value === detectedSchedule.detectedStatus)?.label || formData.status}</Badge></div>
                                {detectedSchedule.totalProgress && (
                                  <div><span className="text-muted-foreground">Total:</span> <span className="ml-2 font-mono">{detectedSchedule.totalProgress} {formData.type === 'anime' ? 'épisodes' : 'chapitres'}</span></div>
                                )}
                                {detectedSchedule.scheduleDay && (
                                  <div><span className="text-muted-foreground">Sortie:</span> <span className="ml-2 capitalize">{detectedSchedule.scheduleDay}s ({detectedSchedule.scheduleType})</span></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Liens détectés */}
                        {detectedSchedule.streamingLinks && (Object.values(detectedSchedule.streamingLinks).some(link => link)) && (
                          <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20 space-y-3">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <Link2 className="h-4 w-4 text-green-600" />
                              <span className="text-green-700 dark:text-green-400">Liens de streaming détectés</span>
                            </div>
                            <div className="space-y-2 ml-6">
                              {detectedSchedule.streamingLinks.crunchyroll && (
                                <div className="flex items-center justify-between text-sm group">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-orange-500">Crunchyroll</Badge>
                                    <span className="text-xs text-muted-foreground">Lien principal</span>
                                  </div>
                                  <a 
                                    href={detectedSchedule.streamingLinks.crunchyroll} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                              {detectedSchedule.streamingLinks.voiranime && (
                                <div className="flex items-center justify-between text-sm group">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-500">VoirAnime</Badge>
                                    <span className="text-xs text-muted-foreground">{detectedSchedule.streamingLinks.crunchyroll ? 'Alternatif' : 'Lien principal'}</span>
                                  </div>
                                  <a 
                                    href={detectedSchedule.streamingLinks.voiranime} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Boutons d'action */}
                        <div className="flex gap-3 pt-2">
                          <Button 
                            onClick={() => setCurrentStep('adjust')} 
                            className="flex-1 gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Confirmer et ajuster
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setCurrentStep('search');
                              setDetectedSchedule(null);
                              setDetectionComplete(false);
                            }}
                          >
                            Chercher autre chose
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <div className="text-muted-foreground">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p className="text-sm">Aucune information détectée</p>
                          <p className="text-xs mt-2">Les données seront à saisir manuellement</p>
                        </div>
                        <Button onClick={() => setCurrentStep('adjust')}>
                          Continuer quand même
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ÉTAPE 3: AJUSTEMENTS ou MODE MANUEL */}
          {(currentStep === 'adjust' || currentStep === 'manual') && (
            <div className="space-y-4 pb-4">
              {currentStep === 'adjust' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm">
                  <Edit3 className="h-4 w-4 text-primary" />
                  <span>Les champs ont été pré-remplis. Ajustez si nécessaire avant d'ajouter.</span>
                </div>
              )}

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
                  <Label>Progression actuelle</Label>
                  <Input type="number" value={formData.currentProgress} onChange={e => setFormData({...formData, currentProgress: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Total (optionnel)</Label>
                  <Input type="number" placeholder="?" value={formData.totalProgress} onChange={e => setFormData({...formData, totalProgress: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lien principal (streaming/scan)</Label>
                <Input placeholder="https://..." value={formData.linkUrl} onChange={e => setFormData({...formData, linkUrl: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Lien secondaire</Label>
                <Input placeholder="https://..." value={formData.additionalUrl} onChange={e => setFormData({...formData, additionalUrl: e.target.value})} />
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
              <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <Label htmlFor="schedule-mode" className="cursor-pointer font-medium">Suivi de sortie</Label>
                  </div>
                  <Switch id="schedule-mode" checked={formData.hasSchedule} onCheckedChange={v => setFormData({...formData, hasSchedule: v})} />
                </div>

                {formData.hasSchedule && (
                  <div className="grid grid-cols-2 gap-3 pt-2 animate-in slide-in-from-top-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fréquence</Label>
                      <Select value={formData.scheduleType} onValueChange={v => setFormData({...formData, scheduleType: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                          <SelectItem value="biweekly">Bi-hebdomadaire</SelectItem>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jour</Label>
                      <Select value={formData.scheduleDay} onValueChange={v => setFormData({...formData, scheduleDay: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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

              {currentStep === 'manual' && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t pt-3">
                  <span>Envie de bénéficier de l'auto-détection ?</span>
                  <button className="underline hover:text-primary font-medium" onClick={() => setCurrentStep('search')}>
                    Rechercher sur AniList
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t mt-4">
          {isDuplicate && !initialData && (
            <div className="w-full mb-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Œuvre déjà dans la bibliothèque</p>
                <p className="text-xs opacity-90 mt-0.5">Une œuvre avec ce titre et ce type existe déjà.</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.title || loading || (isDuplicate && !initialData)}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Enregistrer' : 'Ajouter à ma bibliothèque'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
