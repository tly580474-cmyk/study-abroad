import apiClient from './api';

interface Document {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  status: string;
  created_at: string;
}

export const documentService = {
  getDocuments(applicationId: string): Promise<Document[]> {
    return apiClient.get(`/documents/${applicationId}`).then(res => res.data.data);
  },

  uploadDocument(applicationId: string, file: File, name?: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);

    return apiClient.post(`/documents/${applicationId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data.data);
  },

  deleteDocument(id: string): Promise<void> {
    return apiClient.delete(`/documents/${id}`).then(res => res.data);
  },

  downloadDocument(id: string): string {
    return `/api/documents/download/${id}`;
  },

  previewDocument(id: string): Promise<{ name: string; mimeType: string; dataUrl: string }> {
    return apiClient.get(`/documents/preview/${id}`).then(res => res.data.data);
  },

  fixNames(): Promise<string> {
    return apiClient.get('/documents/fix-names').then(res => res.data.message);
  },
};
