"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import ChatDialog from "@/components/chat/chat-dialog";

export default function ChatToggle() {
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    try {
      console.debug("ChatToggle mounted");
    } catch (e) {}
  }, []);

  const toggle = () => {
    try {
      console.debug("ChatToggle clicked, open=" + open);
    } catch (e) {}
    setOpen((s) => !s);
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-9 w-9 p-0 hover:bg-accent/50"
        data-qa="chat-toggle-button"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle();
        }}
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat"}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {open && <ChatDialog onClose={() => setOpen(false)} />}
    </>
  );
}
