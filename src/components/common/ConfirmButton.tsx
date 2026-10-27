import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmButton({
  label,
  title,
  description,
  onConfirm,
  children,
  variant = "ghost",
  size = "icon",
  confirmText = "Delete",
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirmText?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} aria-label={size === "icon" ? label : undefined}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
