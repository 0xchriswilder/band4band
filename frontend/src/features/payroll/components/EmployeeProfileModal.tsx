import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Avatar } from '../../../components/Avatar';
import { supabase } from '../../../lib/supabase';
import { toDirectImageUrl } from '../../../lib/utils';

const AVATAR_BUCKET = 'employee-avatars';

export function EmployeeProfileModal({
  open,
  onClose,
  employeeAddress,
  employerAddress,
  employerCompanyName,
  initialName,
  initialEmail,
  initialAvatarUrl,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  employeeAddress: string;
  employerAddress: string;
  employerCompanyName: string | null;
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string;
  onSaved?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Pre-fill form when existing profile loads (e.g. after async fetch)
  useEffect(() => {
    if (open) {
      setName(initialName);
      setEmail(initialEmail);
      setAvatarUrl(initialAvatarUrl);
    }
  }, [open, initialName, initialEmail, initialAvatarUrl]);

  const resolvedAvatar = useMemo(() => (avatarUrl ? toDirectImageUrl(avatarUrl) : ''), [avatarUrl]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('employee_display_names')
        .upsert(
          {
            employer_address: employerAddress.toLowerCase(),
            employee_address: employeeAddress.toLowerCase(),
            name: (name || '').trim(),
            email: (email || '').trim() || null,
            avatar_url: avatarUrl?.trim() ? toDirectImageUrl(avatarUrl.trim()) : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'employer_address,employee_address' }
        );
      if (error) throw error;
      toast.success('Profile updated');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${employeeAddress.toLowerCase()}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const base = supabaseUrl.replace(/\/$/, '');
      const publicUrl = base
        ? `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`
        : supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;

      setAvatarUrl(publicUrl);
      toast.success('Profile picture uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="max-w-lg w-full">
        <Card variant="elevated" padding="lg" className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </button>

          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Employee profile</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Your info is shown in the sidebar and helps your employer identify you.
          </p>

          <div className="mt-5 flex items-center gap-4">
            <Avatar src={resolvedAvatar} fallbackText={name} className="h-14 w-14 rounded-xl" />
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                {name || 'Your name'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {employerCompanyName ? `Employee at ${employerCompanyName}` : 'Employee'}
              </p>
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-primary)] hover:bg-gray-50">
                  <Upload className="h-4 w-4 text-[var(--color-primary)]" />
                  {uploading ? 'Uploading…' : 'Upload picture'}
                </span>
              </label>
              {resolvedAvatar && (
                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                  If preview is blocked by browser security, the app will fall back to your initial.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Input label="Name" value={name} onChange={(ev) => setName(ev.target.value)} placeholder="e.g. Jane Doe" />
            <Input label="Email" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="e.g. jane@company.com" />
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || uploading} loading={saving}>
              Save
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

