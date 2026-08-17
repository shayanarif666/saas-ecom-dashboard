import { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { cn } from '../../utils/helpers';

const DEFAULT_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
};

const DEFAULT_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'indent',
  'link',
];

/**
 * Rich text description editor (Quill) for product create/update.
 */
export default function RichTextEditor({
  label,
  value,
  onChange,
  helperText,
  error,
  className,
  placeholder = 'Write a detailed product description…',
}) {
  const modules = useMemo(() => DEFAULT_MODULES, []);

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label className="mb-1.5 block text-sm font-semibold text-text-primary">{label}</label>
      ) : null}
      <div
        className={cn(
          'overflow-hidden rounded-2xl border bg-white transition',
          error ? 'border-danger' : 'border-border focus-within:border-brand/50'
        )}
      >
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={DEFAULT_FORMATS}
          placeholder={placeholder}
          className="product-quill"
        />
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-danger">{error}</p> : null}
      {helperText && !error ? (
        <p className="mt-1.5 text-xs text-text-secondary">{helperText}</p>
      ) : null}
    </div>
  );
}
