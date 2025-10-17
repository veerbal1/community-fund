export default function Home() {
  return (
    <div className="font-sans min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Community Fund</h1>
        <p className="text-gray-600">Decentralized community fund platform on Solana</p>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Community Fund</h2>
          <p className="text-gray-700">
            A transparent and democratic platform for community fund allocation powered by Solana blockchain.
          </p>
        </div>
      </main>
    </div>
  );
}
