export default function Loading() {
  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-5 w-96 max-w-full bg-gray-100 rounded animate-pulse" />
        </header>

        <div className="image-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
