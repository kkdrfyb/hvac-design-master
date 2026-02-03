const API_URL = 'http://localhost:3001/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    async get(path: string) {
        const res = await fetch(`${API_URL}${path}`, { headers: getHeaders() });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async post(path: string, body: any) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async delete(path: string) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};
