import { type ChangeEvent, useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileText, Image as ImageIcon, FileArchive, FileCode, File as FileGeneric, Loader2, HardDrive, Upload } from "lucide-react";
import type { VaultFile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getPlanLimits } from "@/lib/plan";
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
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  const { canUploadVault, applyUsageDelta } = usePlanGate();
  const limits = getPlanLimits(user);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const file = droppedFiles[0];
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (!canUploadVault(fileSizeMB)) {
      toast({ title: "Upload blocked", description: "You have reached your vault storage limit.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      
      console.log("Uploading file:", file.name, "Size:", fileSizeMB.toFixed(2), "MB", "Type:", file.type);
      
      const response = await vaultApi.upload(form);
      
      console.log("Upload response:", response.data);
      
      setFiles((current) => [...current, response.data]);
      applyUsageDelta({ vaultSizeMB: Number(fileSizeMB.toFixed(2)) });
      toast({ title: "Upload complete", description: `${file.name} has been added to your vault.` });
    } catch (error: any) {
      console.error("Upload error:", error);
      
      let errorMessage = "Upload failed";
      if (error?.response?.status === 415) {
        errorMessage = "File type not supported. Please upload: JPG, PNG, WEBP, PDF, or MP3.";
      } else if (error?.response?.status === 400) {
        errorMessage = "Upload failed: File size exceeds limit or vault is full.";
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({ title: "Upload failed", description: errorMessage, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    await uploadFile(file);
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Vault</h1>
            <p className="text-sm text-muted-foreground mt-1">Secure file storage for images, PDFs, and audio.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="vault-file-input"
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/mp4,audio/x-m4a,audio/m4a"
              onChange={handleFileSelected}
            />
            <label htmlFor="vault-file-input" className="inline-flex">
              <Button
                type="button"
                size="sm"
                onClick={handleUploadClick}
                disabled={uploading || !canUploadVault(0)}
                className="inline-flex items-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {canUploadVault(0) ? "Upload file" : "Storage full"}
              </Button>
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
          Allowed file types: JPG, JPEG, PNG, WEBP, PDF, MP3, M4A.
        </div>

        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-400" />
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
        ) : (
          <>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed transition-all ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border/50 bg-transparent hover:border-primary/50"
              } p-8 text-center cursor-pointer`}
            >
              <div className="space-y-2">
                <Upload className={`w-8 h-8 mx-auto transition-colors ${dragActive ? "text-primary" : "text-muted-foreground/50"}`} />
                <p className={`font-medium transition-colors ${dragActive ? "text-primary" : "text-foreground"}`}>
                  {dragActive ? "Drop your files here" : "Drag files here to upload"}
                </p>
                <p className="text-xs text-muted-foreground">or click the upload button above</p>
              </div>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <HardDrive className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">No files in Vault</p>
                <p className="text-xs text-muted-foreground">Files will appear here once you upload them.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {files.map((file) => {
                  const Icon = getFileIcon(file.contentType);
                  return (
                    <div key={file.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-white/20 transition-colors">
                      <div className="bento-icon-box shrink-0">
                        <Icon className="w-4 h-4 text-gray-400" />
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
