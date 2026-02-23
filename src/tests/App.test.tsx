import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock Auth
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: '1', username: 'testuser', role: 'user' },
        logout: vi.fn(),
        isLoading: false
    })
}));

// Mock API
vi.mock('../api', () => ({
    api: {
        get: vi.fn().mockResolvedValue([]),
        post: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({})
    }
}));

describe('HVAC Design Master App', () => {
    it('renders the main dashboard correctly', async () => {
        render(<App />);
        const titles = await screen.findAllByText('子项主页');
        expect(titles.length).toBeGreaterThan(0);
    });

});
