import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, FileText, Download, User, Info, Database, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SubjectBadge } from '../components/ui/SubjectBadge';
import { CurriculumTag } from '../components/ui/CurriculumTag';
import { Resource } from '../types';
import { useResources } from '../hooks/useResources';
import { FilterBar } from '../components/ui/FilterBar';
import { ResourceCard } from '../components/resources/ResourceCard';
import { UploadResourceModal } from '../components/resources/UploadResourceModal';
import { PaperViewer } from '../components/resources/PaperViewer';
import { Button } from '../components/ui/Button';

export function ResourcesPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [filters, setFilters] = useState({
    grade: 'All',
    curriculum: 'All',
    subject: 'All',
    fileType: 'All',
    search: '',
  });

  const { resources, loading } = useResources(filters);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      totalResources: resources.length,
      totalDownloads: resources.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0)
    };
  }, [resources]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />
      
      {/* Slim Header Section */}
      <div className="bg-lux-surface border-b border-lux-border pt-24 pb-8 shadow-xl relative z-10 overflow-hidden mt-16 md:mt-0">
        <div className="absolute inset-0 hidden opacity-[0.03] mix-blend-multiply"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lux-green-500/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-lux-green-500"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-lux-green-500">Peer Library</span>
            </div>
            <h1 className="text-4xl font-serif font-medium text-lux-text tracking-tight">
              Community Resources
            </h1>
            <p className="text-sm text-lux-text mt-2 font-light tracking-wide max-w-lg">Community notes, summaries, and study guides — uploaded by South African learners, for South African learners.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 self-start md:self-auto">
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-lux-green-500 bg-lux-bg border border-lux-border px-4 py-2.5 rounded-lg shadow-sm backdrop-blur-sm">
                <Database size={14} className="text-lux-green-500" />
                {loading ? 'Curating...' : `${stats.totalResources} Documents`}
             </div>
             <Button 
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full sm:w-auto h-10 px-5 rounded-lg bg-lux-green-500 hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500-light text-lux-text font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all text-center flex items-center justify-center gap-2"
              >
                <Plus size={14} strokeWidth={2.5} />
                Upload File
              </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8 relative z-10">
        
        <div className="flex flex-col gap-8">
        {/* Search & Filters */}
        <div className="mb-12 bg-lux-surface p-8 rounded-[2.5rem] border border-lux-border shadow-lux-sm">
          <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-lux-text group-focus-within:text-lux-green-500 transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Search resources by title, topic or tag..."
                className="w-full bg-lux-bg border border-lux-border/60 outline-none rounded-2xl sm:rounded-3xl py-4 pl-16 pr-6 text-sm font-medium text-lux-text focus:border-lux-green-500 transition-all shadow-inner placeholder:text-lux-text"
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex gap-4">
              <select 
                className="bg-lux-bg border border-lux-border/60 outline-none rounded-2xl sm:rounded-3xl py-4 px-6 text-xs font-bold text-lux-text focus:border-lux-green-500 appearance-none min-w-[180px] shadow-inner cursor-pointer"
                value={filters.fileType}
                onChange={(e) => handleFilterChange('fileType', e.target.value)}
              >
                <option value="All">All Formats</option>
                <option value="PDF">PDF Documents</option>
                <option value="PPT">PowerPoint</option>
                <option value="Image">Visual Notes</option>
                <option value="Doc">Word Files</option>
              </select>
            </div>
          </div>
          
          <FilterBar 
            onChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))} 
          />
        </div>

        {/* Resources Grid */}
        <div className="mb-24">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-lux-surface animate-pulse h-[450px] rounded-[2.5rem] border border-lux-border" />
              ))}
            </div>
          ) : resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {resources.map((res) => (
                <ResourceCard 
                  key={res.id} 
                  resource={res} 
                  onPreview={(r) => setPreviewResource(r)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 sm:py-24 md:py-32 bg-lux-surface border border-dashed border-lux-border rounded-[3rem] shadow-lux-sm">
              <div className="w-24 h-24 bg-lux-bg border border-lux-border/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Layers size={40} className="text-lux-text" />
              </div>
              <h3 className="text-4xl font-serif mb-4 text-lux-text">No resources found</h3>
              <p className="text-lux-text max-w-sm mx-auto mb-10 text-sm font-light">
                Be the first to contribute to this category! Upload your notes or summaries to help fellow scholars.
              </p>
              <Button 
                onClick={() => setIsUploadModalOpen(true)}
                variant="outline"
                className="rounded-xl px-8 h-12 text-[11px] uppercase tracking-widest font-bold border-lux-border text-lux-text hover:bg-lux-bg transition-colors"
              >
                <Plus size={16} className="mr-2 text-lux-green-500" />
                Upload Resource
              </Button>
            </div>
          )}
        </div>
        </div>
      </main>

      <Footer />

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <UploadResourceModal 
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onSuccess={() => {
              // The hook will auto-refetch due to Firestore query
            }}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewResource && (
          <PaperViewer 
            isOpen={!!previewResource}
            onClose={() => setPreviewResource(null)}
            fileUrl={previewResource.fileUrl}
            title={previewResource.title}
            fileType={previewResource.fileType}
            subject={previewResource.subject}
            grade={previewResource.grade?.toString()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
