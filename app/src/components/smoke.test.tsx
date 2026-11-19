import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighlightedText } from './HighlightedText';
import { TypeBadge } from './TypeBadge';
import { UnavailableNotice } from './UnavailableNotice';

describe('TypeBadge', () => {
  it('renders the type name as text, not color alone', () => {
    render(<TypeBadge type="Fire" />);
    expect(screen.getByText('Fire').className).toContain('type-fire');
  });
});

describe('HighlightedText', () => {
  it('marks only the highlighted span', () => {
    render(<HighlightedText text="Fire Flying" highlights={[{ offset: 5, length: 6 }]} />);
    expect(screen.getByText('Flying').tagName).toBe('MARK');
    expect(screen.getByText('Fire')).toBeTruthy();
  });
});

describe('UnavailableNotice', () => {
  it('labels a missing license as a note', () => {
    render(<UnavailableNotice title="Passages" detail="Not licensed on this trial." />);
    expect(screen.getByRole('note').textContent).toContain('Not licensed on this trial.');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
