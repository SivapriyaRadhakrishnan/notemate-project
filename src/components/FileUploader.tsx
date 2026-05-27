import { useState } from "react";
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedFormats?: string;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  multiple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 20,
  acceptedFormats = ".pdf,.png,.jpg,.jpeg,.docx,.doc",
  isLoading = false,
  disabled = false,
  label = "Upload Files",
  description = "Drag and drop or click to select files",
  multiple = true,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileValidation = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    setError(null);
    const newFiles: File[] = [];

    Array.from(selectedFiles).forEach((file) => {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit.`);
        return;
      }

      // Check file format
      const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
      if (!acceptedFormats.split(",").map(f => f.trim()).includes(fileExt)) {
        setError(`File format "${fileExt}" is not allowed.`);
        return;
      }

      newFiles.push(file);
    });

    // Check total file count
    const totalFiles = files.length + newFiles.length;
    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed. You have ${totalFiles} files.`);
      return;
    }

    const updatedFiles = multiple ? [...files, ...newFiles] : newFiles;
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles);
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileValidation(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileValidation(e.target.files);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
    onFilesSelected([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-white">{label}</label>
        {description && <p className="mt-1 text-xs text-white/50">{description}</p>}
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed transition cursor-pointer p-8 text-center ${
          dragActive
            ? "border-violet-400 bg-violet-500/10"
            : "border-white/20 bg-white/5 hover:border-white/40"
        } ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          type="file"
          id="file-input"
          multiple={multiple}
          accept={acceptedFormats}
          onChange={handleChange}
          disabled={disabled || isLoading}
          className="hidden"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <Upload className="mx-auto mb-3 text-violet-400" size={32} />
          <p className="text-sm font-semibold text-white">
            {isLoading ? "Uploading..." : "Click to upload or drag and drop"}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Max {maxFiles} files, {maxSizeMB}MB each
          </p>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2 text-sm text-red-200">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white/70">
              Selected Files ({files.length})
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    <p className="text-xs text-white/50">
                      {(file.size / 1024 / 1024).toFixed(2)}MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-white/50 hover:text-red-400 transition flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
