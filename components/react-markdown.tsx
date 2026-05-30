import type { Components } from "react-markdown";

export const markdownComponents: Components = {
  // Buka link di tab baru, styling merah OJK
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#a11212] underline underline-offset-2 break-all"
    >
      {children}
    </a>
  ),

  // Heading di-downscale agar proporsional di bubble kecil
  h1: ({ children }: any) => (
    <p className="font-bold text-[12px] border-b border-[#a11212]/20 pb-0.5 mb-1">
      {children}
    </p>
  ),

  h2: ({ children }: any) => (
    <p className="font-bold text-[11.5px] mb-1">{children}</p>
  ),

  h3: ({ children }: any) => (
    <p className="font-semibold text-[11px] mb-0.5">{children}</p>
  ),

  // Paragraf dengan spacing yang rapat
  p: ({ children }: any) => <p className="mb-1 last:mb-0">{children}</p>,

  // Bullet list
  ul: ({ children }: any) => (
    <ul className="list-disc list-outside ml-3.5 mb-1 space-y-0.5">
      {children}
    </ul>
  ),

  // Numbered list
  ol: ({ children }: any) => (
    <ol className="list-decimal list-outside ml-3.5 mb-1 space-y-0.5">
      {children}
    </ol>
  ),

  // Inline code
  code: ({ children }: any) => (
    <code className="bg-black/10 rounded px-1 py-0.5 font-mono text-[10px]">
      {children}
    </code>
  ),

  // Blockquote — pakai warna OJK sebagai accent
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-[#a11212] pl-2 ml-1 italic text-black/60 my-1">
      {children}
    </blockquote>
  ),

  // Garis pemisah
  hr: () => <hr className="border-t border-black/15 my-1.5" />,

  // Wrapper scroll horizontal agar tabel tidak overflow bubble
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-1 rounded border border-black/10">
      <table className="w-full border-collapse text-[10px]">{children}</table>
    </div>
  ),
  // Header row — pakai warna brand OJK
  thead: ({ children }: any) => (
    <thead className="bg-[#a11212] text-white">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th
      className="px-1.5 py-1 text-left font-semibold text-[10px] whitespace-nowrap"
      style={{ minWidth: "150px" }}
    >
      {children}
    </th>
  ),
  // Body rows — zebra striping
  td: ({ children }: any) => (
    <td
      className="px-1.5 py-1 border-b border-black/[0.07] align-top leading-snug"
      style={{ minWidth: "150px" }}
    >
      {children}
    </td>
  ),
  tbody: ({ children }: any) => (
    <tbody className="[&>tr:nth-child(even)]:bg-black/[0.03]">{children}</tbody>
  ),
};
