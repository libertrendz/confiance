// Redireciona /adm para /adm/dashboard
export default function AdmIndex() {
  if (typeof window !== 'undefined') {
    window.location.replace('/adm/dashboard');
  }
  return null;
}
