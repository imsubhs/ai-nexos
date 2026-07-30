import { Loader2 } from "lucide-react";

export default function SettingsLoading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}
