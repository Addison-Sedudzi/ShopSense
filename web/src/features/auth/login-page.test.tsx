import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login-page';

const signInMock = vi.fn();
const authState = { isAuthenticated: false };

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({ ...authState, signIn: signInMock }),
}));

function renderLoginPage() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <p>Home</p> },
    ],
    { initialEntries: ['/login'] },
  );
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  signInMock.mockReset();
  authState.isAuthenticated = false;
});

describe('LoginPage', () => {
  it('submits the entered credentials', async () => {
    signInMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith('owner@example.com', 'hunter2'));
  });

  it('shows the error message when sign-in fails', async () => {
    signInMock.mockResolvedValue({ error: 'Invalid login credentials' });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
  });

  it('disables the submit button while signing in', async () => {
    let resolveSignIn!: (value: { error: string | null }) => void;
    signInMock.mockReturnValue(new Promise((resolve) => { resolveSignIn = resolve; }));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    resolveSignIn({ error: null });
  });

  it('redirects away from the login form when already authenticated', () => {
    authState.isAuthenticated = true;
    renderLoginPage();

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});
