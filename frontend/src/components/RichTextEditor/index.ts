import dynamic from 'next/dynamic';

export { EditorToolbar } from './RichTextEditor';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
});

export default RichTextEditor;
