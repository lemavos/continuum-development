import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileCode,
  File as FileGeneric,
  Trash2,
  Download,
  Loader2,
  HardDrive,
} from "lucide-react";
import type { VaultFile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS, type Plan } from "@/types";

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/json",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { canUploadVault, usage, getLimitMessage, refresh } = usePlanGate();
  const { user } = useAuth();
  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await vaultApi.list();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Erro ao carregar arquivos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast({ title: `Arquivo muito grande (máx ${MAX_FILE_SIZE_MB}MB)`, variant: "destructive" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Tipo de arquivo não permitido", variant: "destructive" });
      return;
    }
    if (!canUploadVault(fileSizeMB)) {
      setUpgradeOpen(true);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      await vaultApi.upload(file, (pct) => setUploadProgress(pct));
      toast({ title: "Arquivo enviado!" });
      await Promise.all([fetchFiles(), refresh()]);
    } catch (err: any) {
      toast({
        title: "Erro no upload",
        description: err.response?.data?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await vaultApi.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      await refresh();
    } catch {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      const { data } = await vaultApi.download(file.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao baixar", variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const vaultUsedMB = usage?.vaultSizeMB ?? 0;
  const vaultMaxMB = limits.maxVaultSizeMB;
  const vaultPct = vaultMaxMB === -1 ? 0 : Math.min((vaultUsedMB / vaultMaxMB) * 100, 100);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vault</h1>
            <p className="text-sm text-muted-foreground">
              Armazenamento seguro de arquivos
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Upload
            </Button>
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="bento-card p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Enviando arquivo...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5" />
          </div>
        )}

        {/* Storage usage */}
        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">Armazenamento</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {vaultMaxMB === -1
                ? `${vaultUsedMB.toFixed(1)} MB usados`
                : `${vaultUsedMB.toFixed(1)} / ${vaultMaxMB} MB`}
            </span>
          </div>
          <Progress value={vaultMaxMB === -1 ? 0 : vaultPct} className="h-1.5" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <HardDrive className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">Nenhum arquivo no Vault</p>
            <p className="text-xs text-muted-foreground">Faça upload para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file.contentType);
              return (
                <div key={file.id} className="bento-card group p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bento-icon-box shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                    >
                      <Download className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="Você atingiu o limite de armazenamento do seu plano."
      />
    </AppLayout>
  );
}
