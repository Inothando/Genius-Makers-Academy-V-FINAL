import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="pt-28 sm:pt-36 md:pt-48 pb-20 min-h-screen flex flex-col bg-lux-bg font-sans">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-0">
        <h1 className="text-4xl font-serif mb-8 text-lux-text">{title}</h1>
        <div className="glass-panel p-12 text-center shadow-lux-sm">
          <p className="text-lux-text">This section is currently under development. Stay tuned for excellence!</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
