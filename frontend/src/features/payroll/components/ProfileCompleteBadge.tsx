import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useEmployeeProfileComplete } from '../hooks/useEmployeeProfileComplete';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface ProfileCompleteBadgeProps {
  employeeAddress: string | undefined;
  employerAddress: string | undefined;
  className?: string;
}

export function ProfileCompleteBadge({
  employeeAddress,
  employerAddress,
  className,
}: ProfileCompleteBadgeProps) {
  const { name, email, isComplete, missingFields, isLoading, reload } = useEmployeeProfileComplete(
    employeeAddress,
    employerAddress
  );
  const [showModal, setShowModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const openModal = () => {
    setEditName(name);
    setEditEmail(email);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!employeeAddress || !employerAddress) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('employee_display_names')
        .upsert(
          {
            employer_address: employerAddress.toLowerCase(),
            employee_address: employeeAddress.toLowerCase(),
            name: (editName || '').trim(),
            email: (editEmail || '').trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'employer_address,employee_address' }
        );
      if (error) throw error;
      await reload();
      setShowModal(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || (!employeeAddress && !employerAddress)) return null;

  if (isComplete) {
    return (
      <Badge variant="success" size="sm" className={className} title="Name and email are set">
        Profile complete
      </Badge>
    );
  }

  const message =
    missingFields.length === 2
      ? 'Add name & email'
      : missingFields.includes('name')
        ? 'Add name'
        : 'Add email';

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Click to add your name and email (required for Profile complete)"
        className={`cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 ${className ?? ''}`}
      >
        <Badge variant="warning" size="sm">
          {message}
        </Badge>
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
              Complete your profile
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Add your name and email so your employer can reach you. You need both to see the &quot;Profile complete&quot; badge.
            </p>
            <Input
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Jane Doe"
            />
            <Input
              label="Email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="e.g. jane@company.com"
            />
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
                loading={saving}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
