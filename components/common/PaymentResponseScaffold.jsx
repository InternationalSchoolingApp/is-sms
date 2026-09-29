// Placeholder shared by the /common/*payment-response-* landing routes until each is built out.
export function PaymentResponseScaffold({ title, route }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-neutral-500">{route} — scaffold only.</p>
    </main>
  );
}
