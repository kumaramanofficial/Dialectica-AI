import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Save, AlertTriangle } from 'lucide-react';
import AppShell from '../components/AppShell';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';

const Profile = () => {
    const navigate = useNavigate();
    const { user, updateProfile, deleteProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [picture, setPicture] = useState(user?.picture || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateProfile({ name, bio, picture });
            toast.success('Profile updated.');
        } catch {
            toast.error('Update failed.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteProfile();
            toast.success('Account deleted.');
            navigate('/');
        } catch {
            toast.error('Could not delete account.');
        }
    };

    return (
        <AppShell headerSlot={<TopHeader title="Profile" primaryAction="Save" onPrimaryAction={handleSave} />}>
            <div className="max-w-2xl space-y-8" data-testid="profile-page">
                <div>
                    <h1 className="font-display font-black text-4xl tracking-tight">Your Profile</h1>
                    <p className="text-slate-400 mt-2">Update how you appear across Dialectica.</p>
                </div>

                <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-7 space-y-5">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center text-white font-display font-black text-3xl overflow-hidden">
                            {picture ? <img src={picture} alt="" className="w-full h-full object-cover" /> : (user?.name?.charAt(0)?.toUpperCase() || 'U')}
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-semibold" data-testid="profile-email">{user?.email}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{user?.auth_provider}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-white/5 border-white/10 text-white" data-testid="profile-name-input" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Profile picture URL</Label>
                        <Input value={picture} onChange={(e) => setPicture(e.target.value)} placeholder="https://…" className="h-11 bg-white/5 border-white/10 text-white" data-testid="profile-picture-input" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Bio</Label>
                        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself…" className="min-h-[100px] bg-white/5 border-white/10 text-white" data-testid="profile-bio-input" />
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold gap-2" data-testid="profile-save-btn">
                        <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                </div>

                <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-7">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h3 className="font-display font-bold text-white">Danger Zone</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-5">
                        Permanently delete your account, all sessions, and history. This action cannot be undone.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2" data-testid="profile-delete-btn">
                                <Trash2 className="w-4 h-4" /> Delete account
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-brand-navy-elev border-white/10 text-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                    This will permanently erase your profile and all your sessions. You cannot undo this.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10" data-testid="profile-delete-cancel">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white" data-testid="profile-delete-confirm">
                                    Yes, delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </AppShell>
    );
};

export default Profile;
