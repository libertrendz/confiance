export default function Home() {
  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>CONFIANCE</h1>
      <p>Escolha:</p>
      <ul>
        <li><a href="/login">Login</a></li>
        <li><a href="/ponto">Ponto</a></li>
        <li><a href="/adm/pendencias">Pendências (ADM)</a></li>
        <li><a href="/adm/orcamentos">Orçamentos (ADM)</a></li>
      </ul>
    </div>
  );
}
