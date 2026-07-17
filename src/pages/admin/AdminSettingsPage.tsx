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

  const [secrets, setSecrets] = useState<any>({ youtubeApiKey: '' });
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'secrets'), (doc) => {
      if (doc.exists()) {
        setSecrets(doc.data() || { youtubeApiKey: '' });
      }
    });
    return () => unsub();
  }, []);

  const saveSecrets = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'secrets'), {
        ...secrets,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.uid
      });
      alert('Secrets saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save secrets');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="text-center py-20 text-lux-text">
        You do not have permission to view platform settings.
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--color-lux-green-500)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-lux-text mb-1">Platform Settings</h1>
        <p className="text-sm text-lux-text">Global configurations for Genius Makers Academy.</p>
      </header>

      {/* Basic Info */}
      <section className="bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4 text-lux-text font-bold border-b border-lux-border pb-4">
          <Globe size={18} className="text-blue-500" /> Platform Info
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-lux-text uppercase tracking-widest">Academy Name</label>
            <input 
              value={settings.name}
              onChange={e => setSettings({...settings, name: e.target.value})}
              className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-sm text-lux-text focus:border-[var(--color-lux-green-500)] outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-lux-text uppercase tracking-widest">Contact Email</label>
            <input 
              value={settings.contactEmail}
              onChange={e => setSettings({...settings, contactEmail: e.target.value})}
              className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-sm text-lux-text focus:border-[var(--color-lux-green-500)] outline-none"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-bold text-lux-text uppercase tracking-widest">Tagline</label>
            <input 
              value={settings.tagline}
              onChange={e => setSettings({...settings, tagline: e.target.value})}
              className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-sm text-lux-text focus:border-[var(--color-lux-green-500)] outline-none"
            />
          </div>
        </div>
        <Button 
          disabled={saving}
          onClick={() => saveSettings(settings)}
          className="bg-blue-600 hover:bg-blue-700 text-lux-text rounded-xl h-12 w-full flex items-center justify-center gap-2 font-bold"
        >
          {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
        </Button>
      </section>

      {/* Moderation */}
      <section className="bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4 text-lux-text font-bold border-b border-lux-border pb-4">
          <Shield size={18} className="text-amber-500" /> Moderation Keywords
        </div>
        <p className="text-xs text-lux-text">Posts containing these words will be auto-flagged for review.</p>
        
        <div className="flex flex-wrap gap-2">
          {moderationWords.map(kw => (
            <span key={kw} className="px-3 py-1 bg-lux-bg border border-lux-border rounded-lg text-xs text-lux-text flex items-center gap-2 group hover:border-red-500/50 transition-colors">
              {kw}
              <button 
                onClick={() => removeKeyword(kw)}
                className="text-lux-text group-hover:text-red-500"
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
            className="flex-1 bg-black border border-lux-border rounded-xl px-4 py-2.5 text-sm text-lux-text focus:border-amber-500 outline-none"
          />
          <Button onClick={addKeyword} className="bg-lux-surface-alt hover:bg-lux-surface-alt text-lux-text rounded-xl px-6">Add</Button>
        </div>
      </section>

      {/* Feature Flags */}
      <section className="bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4 text-lux-text font-bold border-b border-lux-border pb-4">
          <ToggleRight size={18} className="text-[var(--color-lux-green-500)]" /> Feature Flags
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(settings.features || {}).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-black/40 border border-lux-border rounded-xl">
               <div>
                 <p className="text-sm font-bold text-lux-text capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                 <p className="text-[10px] text-lux-text">Toggle this feature for all users</p>
               </div>
               <button 
                 onClick={() => {
                   const newFeatures = { ...settings.features, [key]: !val };
                   saveSettings({...settings, features: newFeatures});
                 }}
                 className={cn("transition-colors", val ? "text-[var(--color-lux-green-500)]" : "text-lux-text")}
               >
                 {val ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
               </button>
            </div>
          ))}
        </div>
      </section>

      {/* Announcement */}
      <section className="bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4 text-lux-text font-bold border-b border-lux-border pb-4">
          <Megaphone size={18} className="text-green-500" /> Announcement Banner
        </div>
        <div className="flex items-center justify-between mb-4">
           <span className="text-sm text-lux-text">Show notification banner at top of site</span>
           <button 
             onClick={() => saveSettings({...settings, announcementEnabled: !settings.announcementEnabled})}
             className={cn("transition-colors", settings.announcementEnabled ? "text-[var(--color-lux-green-500)]" : "text-lux-text")}
           >
             {settings.announcementEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
           </button>
        </div>
        <textarea 
          placeholder="Enter announcement text..."
          value={settings.announcementText}
          onChange={e => setSettings({...settings, announcementText: e.target.value})}
          disabled={!settings.announcementEnabled}
          className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-lux-text h-24 focus:border-[var(--color-lux-green-500)] outline-none disabled:opacity-30 transition-all font-medium"
        />
        <Button 
          onClick={() => saveSettings(settings)}
          disabled={!settings.announcementEnabled || saving}
          className="w-full bg-lux-surface-alt hover:bg-lux-surface-alt text-lux-text rounded-xl h-12"
        >
          Update Banner
        </Button>
      </section>

      {/* External Integrations */}
      <section className="bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4 text-lux-text font-bold border-b border-lux-border pb-4">
          <Database size={18} className="text-purple-500" /> External API Secrets
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-lux-text uppercase tracking-widest">YouTube Data API v3 Key</label>
            <input 
              type="password"
              placeholder="AIzaSy..."
              value={secrets?.youtubeApiKey || ''}
              onChange={e => setSecrets({...secrets, youtubeApiKey: e.target.value})}
              className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-sm text-lux-text focus:border-purple-500 outline-none font-mono"
            />
            <p className="text-xs text-lux-text">Required for importing playlists and parsing videos.</p>
          </div>
        </div>
        <Button 
          onClick={saveSecrets}
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700 text-lux-text rounded-xl h-12 flex items-center justify-center gap-2 font-bold"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Secrets
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-950/20 border border-red-500/20 rounded-2xl sm:rounded-3xl p-8 space-y-6">
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
             className={cn("transition-colors", settings.maintenanceMode ? "text-red-500" : "text-lux-text")}
           >
             {settings.maintenanceMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
           </button>
        </div>
      </section>
    </div>
  );
}
