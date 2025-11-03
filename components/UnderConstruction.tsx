// components/UnderConstruction.tsx
'use client';

export default function UnderConstruction(props: { title?: string; note?: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="h2">{props.title || 'Em construção'}</div>
      <p className="muted" style={{ marginTop: 8 }}>
        {props.note || 'Esta área está sendo finalizada. Obrigado pela paciência.'}
      </p>
    </div>
  );
}
