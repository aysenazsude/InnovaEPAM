import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '@/components/ideas/FileUpload';

// ── URL mock ─────────────────────────────────────────────────────────────────
let urlCounter = 0;
const mockCreateObjectURL = jest.fn().mockImplementation(() => `blob:mock-url-${urlCounter++}`);
const mockRevokeObjectURL = jest.fn();

Object.defineProperty(window, 'URL', {
  value: Object.assign(Object.create(window.URL), {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  }),
  writable: true,
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeFile(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

function pickFiles(files: File[]) {
  const input = screen.getByTestId('file-picker');
  // jsdom doesn't implement DataTransfer, so set files directly via Object.defineProperty
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  fireEvent.change(input);
}

beforeEach(() => {
  urlCounter = 0;
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('FileUpload', () => {
  it('renders image thumbnail via URL.createObjectURL for JPEG', () => {
    render(<FileUpload />);
    const file = makeFile('photo.jpg', 'image/jpeg');
    pickFiles([file]);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByRole('img', { name: 'photo.jpg' })).toBeInTheDocument();
  });

  it('renders image thumbnail via URL.createObjectURL for PNG', () => {
    render(<FileUpload />);
    const file = makeFile('image.png', 'image/png');
    pickFiles([file]);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByRole('img', { name: 'image.png' })).toBeInTheDocument();
  });

  it('renders <video> element with aria-label for MP4', () => {
    render(<FileUpload />);
    pickFiles([makeFile('video.mp4', 'video/mp4')]);
    const video = screen.getByLabelText('video.mp4');
    expect(video.tagName.toLowerCase()).toBe('video');
  });

  it('renders <video> element with aria-label for MOV', () => {
    render(<FileUpload />);
    pickFiles([makeFile('clip.mov', 'video/quicktime')]);
    const video = screen.getByLabelText('clip.mov');
    expect(video.tagName.toLowerCase()).toBe('video');
  });

  it('renders document icon with accessible name for PDF', () => {
    render(<FileUpload />);
    pickFiles([makeFile('report.pdf', 'application/pdf')]);
    expect(screen.getByRole('img', { name: 'Document: report.pdf' })).toBeInTheDocument();
  });

  it('renders document icon for DOCX', () => {
    render(<FileUpload />);
    pickFiles([
      makeFile(
        'doc.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ]);
    expect(screen.getByRole('img', { name: /Document:/i })).toBeInTheDocument();
  });

  it('renders document icon for PPTX', () => {
    render(<FileUpload />);
    pickFiles([
      makeFile(
        'slides.pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ),
    ]);
    expect(screen.getByRole('img', { name: /Document:/i })).toBeInTheDocument();
  });

  it('shows per-file remove button for each staged file', () => {
    render(<FileUpload />);
    pickFiles([makeFile('a.pdf', 'application/pdf')]);
    expect(screen.getByRole('button', { name: 'Remove a.pdf' })).toBeInTheDocument();
  });

  it('remove button removes only that file, leaving others intact', () => {
    render(<FileUpload />);
    pickFiles([makeFile('a.pdf', 'application/pdf')]);
    pickFiles([makeFile('b.png', 'image/png')]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove a.pdf' }));
    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('add-file control is absent when 3 files are staged', () => {
    render(<FileUpload />);
    pickFiles([
      makeFile('a.pdf', 'application/pdf'),
      makeFile('b.png', 'image/png'),
      makeFile('c.mp4', 'video/mp4'),
    ]);
    expect(screen.queryByRole('button', { name: 'Add File' })).not.toBeInTheDocument();
  });

  it('shows count-limit message when 3 files are staged', () => {
    render(<FileUpload />);
    pickFiles([
      makeFile('a.pdf', 'application/pdf'),
      makeFile('b.png', 'image/png'),
      makeFile('c.mp4', 'video/mp4'),
    ]);
    expect(screen.getByText(/maximum 3 files/i)).toBeInTheDocument();
  });

  it('rejects duplicate file name with inline role="alert" error', () => {
    render(<FileUpload />);
    pickFiles([makeFile('a.pdf', 'application/pdf')]);
    pickFiles([makeFile('a.pdf', 'application/pdf')]);
    expect(screen.getByRole('alert')).toHaveTextContent(/already added/i);
  });

  it('renders per-file type error with role="alert" for disallowed type', () => {
    render(<FileUpload />);
    pickFiles([makeFile('bad.xyz', 'application/x-unknown')]);
    expect(screen.getByRole('alert')).toHaveTextContent(/not allowed/i);
  });

  it('includes a noscript element as a no-JS fallback', () => {
    const { container } = render(<FileUpload />);
    // React client renderer creates the noscript element in the DOM.
    // Its children are accessible as SSR HTML; the unit test verifies the
    // element is present — full fallback behavior is covered by e2e tests.
    expect(container.querySelector('noscript')).not.toBeNull();
  });

  it('calls URL.revokeObjectURL with the preview URL when a file is removed', () => {
    render(<FileUpload />);
    pickFiles([makeFile('a.png', 'image/png')]);
    const createdUrl = mockCreateObjectURL.mock.results[0].value as string;
    fireEvent.click(screen.getByRole('button', { name: 'Remove a.png' }));
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(createdUrl);
  });

  it('calls URL.revokeObjectURL for all remaining staged files on unmount', () => {
    const { unmount } = render(<FileUpload />);
    pickFiles([makeFile('a.png', 'image/png'), makeFile('b.mp4', 'video/mp4')]);
    unmount();
    // Both object URLs should be revoked on cleanup
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
