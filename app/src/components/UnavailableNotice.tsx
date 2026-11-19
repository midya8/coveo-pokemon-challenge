export function UnavailableNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <aside className="trial-note" role="note">
      <h2>{title}</h2>
      <p>{detail}</p>
    </aside>
  );
}
