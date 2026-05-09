export function App() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-300">
          CodeBox
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-white md:text-6xl">
          Frontend is running through your Bun backend.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
          Routes outside <code className="text-emerald-300">/api</code> are handled by React.
        </p>
      </section>
    </main>
  );
}
