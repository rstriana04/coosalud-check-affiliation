import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FileUpload({ onFileSelect, isUploading = false, disabled = false }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: disabled || isUploading
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
        isDragActive && 'border-primary bg-primary/5',
        !isDragActive && 'border-gray-300 hover:border-primary',
        (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-4">
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <div className="text-lg font-semibold">Subiendo archivo...</div>
          </>
        ) : (
          <>
            {isDragActive ? (
              <FileSpreadsheet className="w-12 h-12 text-primary" />
            ) : (
              <Upload className="w-12 h-12 text-gray-400" />
            )}
            
            <div>
              <p className="text-lg font-semibold mb-2">
                {isDragActive 
                  ? 'Suelta el archivo aquí' 
                  : 'Arrastra tu archivo Excel aquí'
                }
              </p>
              <p className="text-sm text-gray-500">
                o haz clic para seleccionar un archivo
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Formatos soportados: .xlsx, .xls
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

