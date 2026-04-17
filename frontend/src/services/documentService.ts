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

  async downloadDocument(id: string, filename?: string): Promise<void> {
    const token = localStorage.getItem('auth-storage');
    const { state } = token ? JSON.parse(token) : { state: null };
    const authToken = state?.token;

    const response = await fetch(`/api/documents/download/${id}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      throw new Error('下载失败');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || '下载文件';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  previewDocument(id: string): Promise<{ name: string; mimeType: string; dataUrl: string }> {
    return apiClient.get(`/documents/preview/${id}`).then(res => res.data.data);
  },

  fixNames(): Promise<string> {
    return apiClient.get('/documents/fix-names').then(res => res.data.message);
  },
};
