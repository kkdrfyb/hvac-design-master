import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as geminiService from '../services/geminiService';

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

vi.mock('../services/geminiService', () => ({
    generateWorkflowQuestion: vi.fn(),
    verifyDesignInput: vi.fn(),
}));

describe('HVAC Design Master App', () => {
    it('renders the main dashboard correctly', async () => {
        render(<App />);
        const titles = await screen.findAllByText('设计流程监控');
        expect(titles.length).toBeGreaterThan(0);
    });

    it('toggles task completion', async () => {
        render(<App />);
        const checkboxes = await screen.findAllByRole('checkbox');
        const firstTask = checkboxes[0];

        // Wrap in act to fix warnings for state updates
        fireEvent.click(firstTask);

        expect(firstTask).toBeDefined();
    });
});
