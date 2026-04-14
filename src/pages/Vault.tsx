import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileText, Image as ImageIcon, FileArchive, FileCode, File as FileGeneric, Loader2, HardDrive } from "lucide-react";
import type { VaultFile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS, type Plan } from "@/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType === "application/pdf" || contentType.includes("word")) return FileText;
  if (contentType === "application/zip") return FileArchive;
  if (contentType === "application/json" || contentType === "text/plain") return FileCode;
  return FileGeneric;
}

export default function Vault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await vaultApi.list();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error loading files", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const vaultUsedMB = files.reduce((total: number, file: VaultFile) => total + file.size / (1024 * 1024), 0);
  const vaultMaxMB = limits.maxVaultSizeMB;
  const vaultPct = vaultMaxMB === -1 ? 0 : Math.min((vaultUsedMB / vaultMaxMB) * 100, 100);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Vault</h1>
            <p className="text-sm text-muted-foreground mt-1">Secure file storage (view-only)</p>
          </div>
          <Button size="sm" disabled className="bg-muted text-muted-foreground cursor-not-allowed">
            Upload (coming soon)
          </Button>
        </div>

        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-foreground font-medium">Storage</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {vaultMaxMB === -1 ? `${vaultUsedMB.toFixed(1)} MB used` : `${vaultUsedMB.toFixed(1)} / ${vaultMaxMB} MB`}
            </span>
          </div>
          <Progress value={vaultMaxMB === -1 ? 0 : vaultPct} className="h-1" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <HardDrive className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">No files in Vault</p>
            <p className="text-xs text-muted-foreground">Upload will be available soon</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => {
              const Icon = getFileIcon(file.contentType);
              return (
                <div key={file.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-cyan-500/30 transition-colors">
                  <div className="bento-icon-box shrink-0">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString("en-US")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
