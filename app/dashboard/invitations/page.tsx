import InvitationsList from '@/components/dashboard/invitations-list';

export default function InvitationsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Invitations</h1>
      <p className="text-sm text-muted-foreground mb-4">Invitations de dashboards partagés avec vous.</p>
      <InvitationsList />
    </div>
  );
}
