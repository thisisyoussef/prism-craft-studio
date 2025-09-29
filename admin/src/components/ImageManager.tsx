import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_ORIGIN } from '../lib/api';

interface ImageManagerProps {
  images: string[];
  entityType: 'product' | 'variant';
  entityId: string;
  onImagesUpdate: (images: string[]) => void;
  maxImages?: number;
}

export function ImageManager({ 
  images, 
  entityType, 
  entityId, 
  onImagesUpdate, 
  maxImages = 10 
}: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filePurpose', 'artwork');
      if (entityType === 'product') {
        formData.append('productId', entityId);
      } else {
        formData.append('variantId', entityId);
      }
      
      const res = await api.post<{ fileUrl: string }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.fileUrl;
    },
    onSuccess: (fileUrl) => {
      const absolute = /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_ORIGIN}${fileUrl}`;
      const newImages = [...images, absolute];
      onImagesUpdate(newImages);
      updateEntityImages(newImages);
    },
  });

  const updateEntityImages = async (newImages: string[]) => {
    try {
      const endpoint = entityType === 'product' 
        ? `/products/${entityId}` 
        : `/variants/${entityId}`;
      await api.patch(endpoint, { images: newImages });
      
      // Invalidate relevant queries
      if (entityType === 'product') {
        qc.invalidateQueries({ queryKey: ['products', entityId] });
      } else {
        qc.invalidateQueries({ queryKey: ['products', 'variants'] });
      }
    } catch (error) {
      console.error('Failed to update images:', error);
    }
  };

  const removeImage = async (imageUrl: string) => {
    const newImages = images.filter(img => img !== imageUrl);
    onImagesUpdate(newImages);
    await updateEntityImages(newImages);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (images.length >= maxImages) break;
        await uploadImage.mutateAsync(file);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Images ({images.length}/{maxImages})</h3>
        {images.length < maxImages && (
          <label className="cursor-pointer bg-brand-600 text-white px-3 py-2 rounded text-sm hover:bg-brand-700">
            {uploading ? 'Uploading...' : 'Add Images'}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-500">No images uploaded</div>
          <div className="text-sm text-gray-400 mt-1">
            Upload images to showcase this {entityType}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div key={imageUrl} className="relative group">
              <img
                src={imageUrl}
                alt={`${entityType} image ${index + 1}`}
                className="w-full h-32 object-cover rounded border"
                onError={(e) => {
                  // Handle broken images
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM4LjY4NjI5IDE2IDYgMTMuMzEzNyA2IDEwQzYgNi42ODYyOSA4LjY4NjI5IDQgMTIgNEMxNS4zMTM3IDQgMTggNi42ODYyOSAxOCAxMEMxOCAxMy4zMTM3IDE1LjMxMzcgMTYgMTIgMTZaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0xMiAxMkMxMC44OTU0IDEyIDEwIDExLjEwNDYgMTAgMTBDMTAgOC44OTU0MyAxMC44OTU0IDggMTIgOEMxMy4xMDQ2IDggMTQgOC44OTU0MyAxNCAxMEMxNCAxMS4xMDQ2IDEzLjEwNDYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
                }}
              />
              <button
                onClick={() => removeImage(imageUrl)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                ×
              </button>
              {index === 0 && (
                <div className="absolute bottom-1 left-1 bg-brand-600 text-white px-2 py-1 rounded text-xs">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-gray-500">
          Uploading images...
        </div>
      )}
    </div>
  );
}
