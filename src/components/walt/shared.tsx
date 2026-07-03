import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StoryStatus = "draft" | "pending" | "approved" | "rejected";
export type StoryType = "user" | "catalog" | "seasonal";

export interface AdminStory {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  mode: string;
  language: string;
  age: string;
  cover_key: string;
  duration: number;
  status: StoryStatus;
  story_type: StoryType;
  holiday_tag: string | null;
  active: boolean;
  visible_from: string | null;
  visible_to: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<StoryStatus, string> = {
  draft: "Bozza",
  pending: "In revisione",
  approved: "Approvata",
  rejected: "Rifiutata",
};

const STATUS_VARIANT: Record<StoryStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function ReviewStatusBadge({ status }: { status: StoryStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function SuspendedBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="default">Attiva</Badge> : <Badge variant="outline">Sospesa</Badge>;
}

interface ScheduleEditorProps {
  visibleFrom: string | null;
  visibleTo: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

function toInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

function fromInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function ScheduleEditor({ visibleFrom, visibleTo, onChange }: ScheduleEditorProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Visibile dal</Label>
        <Input
          type="datetime-local"
          value={toInputValue(visibleFrom)}
          onChange={(e) => onChange(fromInputValue(e.target.value), visibleTo)}
          className="h-8 w-48"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">al</Label>
        <Input
          type="datetime-local"
          value={toInputValue(visibleTo)}
          onChange={(e) => onChange(visibleFrom, fromInputValue(e.target.value))}
          className="h-8 w-48"
        />
      </div>
    </div>
  );
}
