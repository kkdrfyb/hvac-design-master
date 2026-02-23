const API_URL = '/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const getJsonHeaders = () => ({
    'Content-Type': 'application/json',
    ...getAuthHeaders()
});

const getErrorMessage = async (res: Response) => {
    const text = await res.text();
    try {
        const payload = JSON.parse(text);
        return payload.detail || payload.error || text;
    } catch {
        return text;
    }
};

export const api = {
    async get(path: string) {
        const res = await fetch(`${API_URL}${path}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(await getErrorMessage(res));
        return res.json();
    },
    async post(path: string, body: any) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: getJsonHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await getErrorMessage(res));
        return res.json();
    },
    async delete(path: string) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error(await getErrorMessage(res));
        return res.json();
    },
    async uploadFiles(path: string, files: FileList | File[], fields: Record<string, string> = {}) {
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
        Array.from(files).forEach(file => formData.append('files', file));

        const res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });
        if (!res.ok) throw new Error(await getErrorMessage(res));
        return res.json();
    },
    async downloadFile(path: string) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error(await getErrorMessage(res));

        const contentDisposition = res.headers.get('content-disposition') || '';
        const fileNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
        const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : '';
        const blob = await res.blob();
        return { blob, fileName };
    }
};
