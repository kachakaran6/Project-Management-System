import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, X, FileImage, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export function ImageUploadField({ value, onChange, maxFiles = 10 }: ImageUploadFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setError(null);
      
      if (fileRejections.length > 0) {
        setError("Some files were rejected. Please upload valid images under 5MB.");
      }

      if (value.length + acceptedFiles.length > maxFiles) {
        setError(`You can only upload up to ${maxFiles} images.`);
        const allowedFiles = acceptedFiles.slice(0, maxFiles - value.length);
        onChange([...value, ...allowedFiles]);
        return;
      }

      onChange([...value, ...acceptedFiles]);
    },
    [onChange, value, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles,
  });

  const removeFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newValues = [...value];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 text-[13px] font-semibold text-muted-foreground/80 hover:text-foreground transition-all group",
          value.length > 0 && "text-primary"
        )}
      >
        <div className={cn(
          "p-1.5 rounded-md transition-all duration-300",
          value.length > 0 ? "bg-primary/10 text-primary" : "bg-muted group-hover:bg-muted/80"
        )}>
          <ImagePlus className="size-4" />
        </div>
        {value.length > 0 ? `Attachments (${value.length})` : "Attach Images"}
        {value.length > 0 && <CheckCircle2 className="size-3.5 ml-1 text-primary opacity-80" />}
      </button>

      {(isExpanded || value.length > 0) && (
        <div className="space-y-4 pt-1 animate-in slide-in-from-top-2 fade-in duration-300">
          {value.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {value.map((file, i) => (
                <ImagePreviewThumb
                  key={`${file.name}-${i}`}
                  file={file}
                  onRemove={(e) => removeFile(e, i)}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}

          <div
            {...getRootProps()}
            className={cn(
              "relative overflow-hidden rounded-xl border-2 border-dashed p-6 transition-all duration-300 group cursor-pointer",
              isDragActive
                ? "border-primary/50 bg-primary/5 scale-[1.02] shadow-sm"
                : "border-border/40 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className={cn(
                "p-3 rounded-full transition-all duration-300",
                isDragActive ? "bg-primary/20 text-primary scale-110" : "bg-background shadow-sm text-muted-foreground group-hover:text-primary group-hover:scale-105"
              )}>
                <UploadCloud className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {isDragActive ? "Drop images here..." : "Click or drag images to upload"}
                </p>
                <p className="text-xs text-muted-foreground/70 font-medium">
                  PNG, JPG, or WEBP (max. 5MB)
                </p>
              </div>
            </div>
            {/* Ambient Background Gradient */}
            {isDragActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-xl pointer-events-none" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ImagePreviewThumb = ({ file, onRemove }: { file: File, onRemove: (e: React.MouseEvent) => void }) => {
  const [previewUrl, setPreviewUrl] = React.useState<string>("");

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 shadow-sm bg-background">
      {previewUrl && (
        <img
          src={previewUrl}
          alt={file.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          className="bg-destructive text-destructive-foreground p-1.5 rounded-full hover:scale-110 transition-transform shadow-md"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-[10px] text-white truncate font-medium">{file.name}</p>
      </div>
    </div>
  );
};
