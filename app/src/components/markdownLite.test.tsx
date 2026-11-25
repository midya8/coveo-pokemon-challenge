import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderMarkdownLite } from './markdownLite';

describe('renderMarkdownLite', () => {
  it('renders headings, bold, lists and grouped quotes without raw markup', () => {
    const { container } = render(
      <div>
        {renderMarkdownLite(
          [
            '# Lucario Type',
            'Lucario is a **Fighting/Steel** type Pokémon.',
            '> "Lucario is a Fighting/Steel type Pokémon',
            '> introduced in Generation 4."',
            '- Fighting',
            '- Steel',
          ].join('\n'),
        )}
      </div>,
    );
    expect(container.querySelector('.ga-heading strong')?.textContent).toBe('Lucario Type');
    expect(container.querySelector('p:not(.ga-heading) strong')?.textContent).toBe('Fighting/Steel');
    expect(container.querySelectorAll('blockquote')).toHaveLength(1);
    expect(container.querySelectorAll('blockquote p')).toHaveLength(2);
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.textContent).not.toMatch(/[#>*]/);
  });
});
