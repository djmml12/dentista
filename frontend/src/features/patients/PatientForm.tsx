import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PatientFormInput, PatientWithHistory } from '@/types/patient';

interface Props {
  initial?: Partial<PatientWithHistory>;
  onSubmit: (data: PatientFormInput) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string | null;
}

const fields = [
  ['firstName', 'Nombre', true],
  ['lastName', 'Apellido', true],
  ['documentId', 'Documento de identidad', false],
  ['birthDate', 'Fecha de nacimiento', false, 'date'],
  ['sex', 'Sexo', false],
  ['phone', 'Teléfono', false, 'tel'],
  ['email', 'Correo', false, 'email'],
  ['address', 'Dirección', false],
  ['emergencyContactName', 'Contacto de emergencia', false],
  ['emergencyContactPhone', 'Teléfono de emergencia', false, 'tel'],
] as const;

export function PatientForm({ initial, onSubmit, onCancel, submitting, error }: Props) {
  const [state, setState] = useState<PatientFormInput>({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    documentId: initial?.documentId ?? '',
    birthDate: initial?.birthDate ? initial.birthDate.slice(0, 10) : '',
    sex: initial?.sex ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    emergencyContactName: initial?.emergencyContactName ?? '',
    emergencyContactPhone: initial?.emergencyContactPhone ?? '',
    notes: initial?.notes ?? '',
  });

  function update<K extends keyof PatientFormInput>(key: K, value: PatientFormInput[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handle(e: FormEvent) {
    e.preventDefault();
    const payload: PatientFormInput = {
      firstName: state.firstName!.trim(),
      lastName: state.lastName!.trim(),
      documentId: state.documentId?.trim() || null,
      birthDate: state.birthDate ? new Date(state.birthDate).toISOString() : null,
      sex: state.sex?.trim() || null,
      phone: state.phone?.trim() || null,
      email: state.email?.trim() || null,
      address: state.address?.trim() || null,
      emergencyContactName: state.emergencyContactName?.trim() || null,
      emergencyContactPhone: state.emergencyContactPhone?.trim() || null,
      notes: state.notes?.trim() || null,
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handle} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(([key, label, required, type]) => (
          <label key={key} className="block space-y-1.5">
            <span className="text-sm font-medium">
              {label} {required && <span className="text-danger">*</span>}
            </span>
            <Input
              type={type ?? 'text'}
              required={required}
              value={(state[key] as string) ?? ''}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Notas</span>
        <textarea
          rows={3}
          value={state.notes ?? ''}
          onChange={(e) => update('notes', e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
        />
      </label>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
