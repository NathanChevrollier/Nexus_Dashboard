"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

export default function ContactSettings() {
  const [formData, setFormData] = useState({
    type: "feedback",
    subject: "",
    message: "",
    utilisateur: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      setResult({
        type: "success",
        message: "Message envoyé avec succès ! Merci pour votre retour.",
      });

      // Reset form
      setFormData({
        type: "feedback",
        subject: "",
        message: "",
        utilisateur: session?.user?.name || "",
      });
    } catch (error: any) {
      setResult({
        type: "error",
        message: error.message || "Une erreur est survenue",
      });
    } finally {
      setLoading(false);
    }
  };

  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      const name = session.user.name || session.user.email || "";
      setFormData((s) => ({ ...s, utilisateur: name }));
    }
  }, [session]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nous contacter</CardTitle>
        <CardDescription>
          Envoyez-nous vos suggestions, questions ou signalez un bug.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type de message</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">Feedback / Suggestion</SelectItem>
                <SelectItem value="bug">Signalement de bug</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Résumé de votre message"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="utilisateur">Utilisateur</Label>
            <Input
              id="utilisateur"
              value={formData.utilisateur}
              readOnly
              disabled
            />
            <p className="text-xs text-muted-foreground">Le nom affiché provient de votre compte</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Décrivez votre demande en détail..."
              required
              disabled={loading}
              rows={6}
              className="resize-none"
            />
          </div>

          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                result.type === "success"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
