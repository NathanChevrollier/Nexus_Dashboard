"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Layout, Library, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { dismissGuide } from "@/lib/actions/users";

const GUIDE_STEPS = [
  {
    title: "Bienvenue sur Nexus",
    icon: Sparkles,
    description: "Votre tableau de bord personnalisable",
    content: "Nexus est votre centre de contrôle personnel. Créez des tableaux de bord sur mesure, ajoutez des widgets, et organisez votre espace de travail selon vos besoins.",
    color: "from-purple-500 to-pink-500"
  },
  {
    title: "Maîtrisez votre Dashboard",
    icon: Layout,
    description: "Organisez votre espace",
    content: "Créez plusieurs dashboards, ajoutez des widgets (météo, notes, RSS, jeux...), organisez-les par catégories et personnalisez tout selon vos préférences.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "Bibliothèque & Médias",
    icon: Library,
    description: "Gérez votre collection",
    content: "Suivez vos films, séries et animes préférés. Marquez ce que vous avez vu, ajoutez des notes, et découvrez de nouveaux contenus grâce à l'intégration TMDB.",
    color: "from-emerald-500 to-teal-500"
  },
  {
    title: "Outils & Productivité",
    icon: CheckSquare,
    description: "Explorez les fonctionnalités",
    content: "Utilisez les widgets productifs (calculatrice, chronomètre, notes), jouez à des jeux (Snake, 2048, Pac-Man, Tetris), et personnalisez l'apparence avec les thèmes.",
    color: "from-orange-500 to-red-500"
  }
];

interface AppGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppGuideDialog({ open, onOpenChange }: AppGuideDialogProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await dismissGuide();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error dismissing guide:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const step = GUIDE_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className={`flex items-center gap-3 mb-4 p-4 -m-6 -mt-2 rounded-t-lg bg-gradient-to-r ${step.color}`}>
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-xl">{step.title}</DialogTitle>
              <p className="text-white/80 text-sm">{step.description}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          <p className="text-muted-foreground leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-2 mb-4">
          {GUIDE_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep 
                  ? "w-8 bg-primary" 
                  : index < currentStep 
                    ? "w-2 bg-primary/50" 
                    : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          <span className="text-sm text-muted-foreground">
            {currentStep + 1} / {GUIDE_STEPS.length}
          </span>

          {isLastStep ? (
            <Button 
              onClick={handleFinish} 
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? "Fermeture..." : "Terminer"}
              <CheckSquare className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Ne plus afficher ce guide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
