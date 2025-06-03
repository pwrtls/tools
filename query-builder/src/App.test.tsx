import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders submit button', () => {
  render(<App />);
  const button = screen.getByText(/submit/i);
  expect(button).toBeInTheDocument();
});
