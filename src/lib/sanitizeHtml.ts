import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p','br','a','strong','em','u','b','i','span','div',
  'h1','h2','h3','h4','h5','h6',
  'ul','ol','li',
  'table','thead','tbody','tr','td','th',
  'img','hr','blockquote','pre','code',
];

const ALLOWED_ATTR = ['href','src','alt','title','class','style','target','rel','width','height','colspan','rowspan'];

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onmouseenter','onfocus','onblur','onchange','onsubmit'],
    ALLOW_DATA_ATTR: false,
  });
}
