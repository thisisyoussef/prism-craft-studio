import { http, request } from '../http';

export const fileApi = {
	listByOrder: (orderId: string) => http.get<any[]>(`/api/files/order/${orderId}`),
	uploadToOrder: async (orderId: string, file: File, filePurpose: 'artwork' | 'tech_pack' | 'reference' | 'proof' | 'final_design' = 'artwork') => {
		const form = new FormData();
		form.set('orderId', orderId);
		form.set('filePurpose', filePurpose);
		form.set('file', file);
		return request<{ fileUrl: string }>('POST', '/api/files/upload', { rawBody: form as any, headers: {} });
	}
};