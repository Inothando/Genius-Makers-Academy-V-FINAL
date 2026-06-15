import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Flag, 
  Megaphone, 
  AlertOctagon, 
  Globe, 
  Save, 
  Loader2,
  ToggleLeft,
  ToggleRight,
  Plus,
  X,
  Database
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function AdminSettingsPage() {
  const { isSuperAdmin, adminUser } = useAdminAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;

    const unsubscribe = onSnapshot(doc(db, 'settings', 'platform'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      } else {
        // Initialize default settings
        setSettings({
          name: 'Genius Makers Academy',
          tagline: "South Africa's most powerful free study platform",
          contactEmail: 'support@gma.co.za',
          maintenanceMode: false,
          announcementEnabled: false,
          announcementText: '',
          features: {
            aiExplainer: true,
            guestPosting: true,
            resourceUploads: true,
            videoLessons: true
          }
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  const saveSettings = async (newData: any) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'platform'), {
        ...newData,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.uid
      });
      
      await addDoc(collection(db, 'admin_audit_log'), {
        action: 'settings_updated',
        actorUid: adminUser?.uid,
        actorName: adminUser?.displayName,
        details: 'Updated platform settings',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const [moderationWords, setModerationWords] = useState<string[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'moderation'), (doc) => {
      if (doc.exists()) {
        setModerationWords(doc.data().keywords || []);
      }
    });
    return () => unsub();
  }, []);

  const addKeyword = async () => {
    if (!newKeyword) return;
    const newList = [...moderationWords, newKeyword];
    await setDoc(doc(db, 'settings', 'moderation'), { keywords: newList });
    setNewKeyword('');
  };

  const removeKeyword = async (kw: string) => {
    const newList = moderationWords.filter(w => w !== kw);
    await setDoc(doc(db, 'settings', 'moderation'), { keywords: newList });
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20 text-gray-500">
        You do not have permission to view platform settings.
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-white mb-1">Platform Settings</h1>
        <p className="text-sm text-gray-500">Global configurations for Genius Makers Academy.</p>
      </header>

      {/* Basic Info */}
      <section className="bg-[#111111] border border-gray-800 rounded-2xl p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4 text-white font-bold border-b border-gray-800 pb-4">
          <Globe size={18} className="text-blue-500" /> Platform Info
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Academy Name</label>
            <input 
              value={settings.name}
              onChange={e => setSettings({...settings, name: e.target.value})}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#1D9E75] outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contact Email</label>
            <input 
              value={settings.contactEmail}
              onChange={e => setSettings({...settings, contactEmail: e.target.value})}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#1D9E75] outline-none"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tagline</label>
            <input 
              value={settings.tagline}
              onChange={e => setSettings({...settings, tagline: e.target.value})}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#1D9E75] outline-none"
            />
          </div>
        </div>
        <Button 
          disabled={saving}
          onClick={() => saveSettings(settings)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 w-full flex items-center justify-center gap-2 font-bold"
        >
          {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
        </Button>
      </section>

      {/* Moderation */}
      <section className="bg-[#111111] border border-gray-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4 text-white font-bold border-b border-gray-800 pb-4">
          <Shield size={18} className="text-amber-500" /> Moderation Keywords
        </div>
        <p className="text-xs text-gray-500">Posts containing these words will be auto-flagged for review.</p>
        
        <div className="flex flex-wrap gap-2">
          {moderationWords.map(kw => (
            <span key={kw} className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white flex items-center gap-2 group hover:border-red-500/50 transition-colors">
              {kw}
              <button 
                onClick={() => removeKeyword(kw)}
                className="text-gray-600 group-hover:text-red-500"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addKeyword()}
            placeholder="Add keyword..."
            className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 outline-none"
          />
          <Button onClick={addKeyword} className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6">Add</Button>
        </div>
      </section>

      {/* Feature Flags */}
      <section className="bg-[#111111] border border-gray-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4 text-white font-bold border-b border-gray-800 pb-4">
          <ToggleRight size={18} className="text-[#1D9E75]" /> Feature Flags
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(settings.features || {}).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-black/40 border border-gray-800 rounded-xl">
               <div>
                 <p className="text-sm font-bold text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                 <p className="text-[10px] text-gray-600">Toggle this feature for all users</p>
               </div>
               <button 
                 onClick={() => {
                   const newFeatures = { ...settings.features, [key]: !val };
                   saveSettings({...settings, features: newFeatures});
                 }}
                 className={cn("transition-colors", val ? "text-[#1D9E75]" : "text-gray-600")}
               >
                 {val ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
               </button>
            </div>
          ))}
        </div>
      </section>

      {/* Announcement */}
      <section className="bg-[#111111] border border-gray-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4 text-white font-bold border-b border-gray-800 pb-4">
          <Megaphone size={18} className="text-green-500" /> Announcement Banner
        </div>
        <div className="flex items-center justify-between mb-4">
           <span className="text-sm text-gray-300">Show notification banner at top of site</span>
           <button 
             onClick={() => saveSettings({...settings, announcementEnabled: !settings.announcementEnabled})}
             className={cn("transition-colors", settings.announcementEnabled ? "text-[#1D9E75]" : "text-gray-600")}
           >
             {settings.announcementEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
           </button>
        </div>
        <textarea 
          placeholder="Enter announcement text..."
          value={settings.announcementText}
          onChange={e => setSettings({...settings, announcementText: e.target.value})}
          disabled={!settings.announcementEnabled}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white h-24 focus:border-[#1D9E75] outline-none disabled:opacity-30 transition-all font-medium"
        />
        <Button 
          onClick={() => saveSettings(settings)}
          disabled={!settings.announcementEnabled || saving}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-xl h-12"
        >
          Update Banner
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-950/20 border border-red-500/20 rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2 text-red-500 font-bold">
          <AlertOctagon size={18} /> Danger Zone
        </div>
        <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
           <div>
             <p className="text-sm font-bold text-red-500">Maintenance Mode</p>
             <p className="text-[10px] text-red-500/60 uppercase font-black">Admins only access while active</p>
           </div>
           <button 
             onClick={() => {
               if(window.confirm("Activate Maintenance Mode? Non-admin users will be locked out.")) {
                 saveSettings({...settings, maintenanceMode: !settings.maintenanceMode});
               }
             }}
             className={cn("transition-colors", settings.maintenanceMode ? "text-red-500" : "text-gray-700")}
           >
             {settings.maintenanceMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
           </button>
        </div>
      </section>
    </div>
  );
}
