import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Facility Manager',
  description: 'Service Maintenance des Infrastructures multi-sites du groupe Elkateb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="leading-tight">
              <div className="font-bold text-lg tracking-tight text-slate-900">🏢 Facility Manager</div>
              <div className="text-xs text-slate-400 font-normal">Service Maintenance des Infrastructures multi-sites du groupe Elkateb</div>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
              <Link href="/demandes" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors">
                Demandes
              </Link>

              {/* Dashboards dropdown */}
              <div className="relative group">
                <button className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1">
                  Tableaux de bord
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-20">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-44">
                    <Link href="/dashboard/dg" className="block px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      Directeur Général
                    </Link>
                    <Link href="/dashboard/directeur" className="block px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      Directeur d&apos;entité
                    </Link>
                    <Link href="/dashboard/electricien" className="block px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      Prestataire de service
                    </Link>
                    <Link href="/dashboard/demandeur" className="block px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      Demandeur
                    </Link>
                  </div>
                </div>
              </div>

              <Link href="/kpi" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors">
                KPI
              </Link>
              <Link href="/settings" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors">
                Paramètres
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
