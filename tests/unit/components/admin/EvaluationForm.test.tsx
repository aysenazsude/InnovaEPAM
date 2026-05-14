import React from 'react';
import { render, screen } from '@testing-library/react';
import { EvaluationForm } from '@/components/admin/EvaluationForm';
import type { Attachment } from '@/lib/db/schema';

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('@/lib/actions/evaluation', () => ({
  acceptIdea: jest.fn(),
  rejectIdea: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 'att-1',
    ideaId: 'idea-1',
    fileName: 'file.pdf',
    fileType: 'application/pdf',
    fileSize: 102_400,
    storagePath: 'uploads/file.pdf',
    uploadedAt: 1_000_000,
    uploadOrderIndex: 0,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('EvaluationForm — attachment display', () => {
  it('shows "No attachments" when attachments array is empty', () => {
    render(<EvaluationForm ideaId="idea-1" attachments={[]} />);
    expect(screen.getByText(/no attachments/i)).toBeInTheDocument();
  });

  it('renders one row per attachment', () => {
    const atts = [
      makeAttachment({ id: 'att-1', fileName: 'a.pdf' }),
      makeAttachment({ id: 'att-2', fileName: 'b.png', fileType: 'image/png' }),
    ];
    render(<EvaluationForm ideaId="idea-1" attachments={atts} />);
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('renders a download link for each attachment pointing to /api/attachments/<id>', () => {
    const att = makeAttachment({ id: 'att-42', fileName: 'report.pdf' });
    render(<EvaluationForm ideaId="idea-1" attachments={[att]} />);
    const link = screen.getByRole('link', { name: 'report.pdf' });
    expect(link).toHaveAttribute('href', '/api/attachments/att-42');
  });

  it('shows formatted file size for each attachment', () => {
    // 102_400 bytes = 100 KB
    const att = makeAttachment({ fileSize: 102_400 });
    render(<EvaluationForm ideaId="idea-1" attachments={[att]} />);
    expect(screen.getByText(/100 KB/i)).toBeInTheDocument();
  });

  it('shows type label for PDF', () => {
    const att = makeAttachment({ fileType: 'application/pdf' });
    render(<EvaluationForm ideaId="idea-1" attachments={[att]} />);
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('renders <img> thumbnail for image/jpeg attachment', () => {
    const att = makeAttachment({
      id: 'att-img',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
    });
    render(<EvaluationForm ideaId="idea-1" attachments={[att]} />);
    const img = screen.getByRole('img', { name: 'photo.jpg' });
    expect(img).toHaveAttribute('src', '/api/attachments/att-img');
  });

  it('renders <img> thumbnail for image/png attachment', () => {
    const att = makeAttachment({
      id: 'att-png',
      fileName: 'banner.png',
      fileType: 'image/png',
    });
    render(<EvaluationForm ideaId="idea-1" attachments={[att]} />);
    const img = screen.getByRole('img', { name: 'banner.png' });
    expect(img).toHaveAttribute('src', '/api/attachments/att-png');
  });

  it('renders <video> element for video/mp4 attachment', () => {
    const att = makeAttachment({
      id: 'att-video',
      fileName: 'demo.mp4',
      fileType: 'video/mp4',
    });
    render(<EvaluationForm ideaId="idea-1" attachments={[att]} />);
    const video = screen.getByLabelText('demo.mp4');
    expect(video.tagName.toLowerCase()).toBe('video');
    expect(video).toHaveAttribute('src', '/api/attachments/att-video');
  });

  it('renders document icon for application/pdf attachment', () => {
    const att = makeAttachment({ fileName: 'doc.pdf', fileType: 'application/pdf' });
    render(<EvaluationForm ideaId="idea-1" attachments={[att]} />);
    expect(screen.getByRole('img', { name: 'Document: doc.pdf' })).toBeInTheDocument();
  });
});
