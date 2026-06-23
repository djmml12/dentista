import { useState, useEffect, type FormEvent } from 'react';
import { Send, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { emailApi, type EmailConfigInput } from './email.api';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div
      className="flex items-start gap-4 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      <span
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-teal-600' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </label>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border pb-3 mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

export function EmailConfigSection() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['email-config'],
    queryFn: emailApi.getConfig,
  });

  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [fromName, setFromName] = useState('Consultorio Dental');
  const [fromEmail, setFromEmail] = useState('');
  const [notifyAppointment, setNotifyAppointment] = useState(true);
  const [notifyPrescription, setNotifyPrescription] = useState(true);
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number[]>([]);
  const [testTo, setTestTo] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (cfg) {
      setEnabled(cfg.enabled);
      setHost(cfg.host);
      setPort(cfg.port);
      setSecure(cfg.secure);
      setUser(cfg.user);
      setFromName(cfg.fromName);
      setFromEmail(cfg.fromEmail);
      setNotifyAppointment(cfg.notifyAppointment);
      setNotifyPrescription(cfg.notifyPrescription);
      setReminderHoursBefore(cfg.reminderHoursBefore ?? []);
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: EmailConfigInput) => emailApi.saveConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-config'] });
      setSaveError(null);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    },
    onError: (err) => {
      setSaveError(err instanceof ApiError ? err.message : 'No se pudo guardar la configuración');
      setSaveOk(false);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    const data: EmailConfigInput = {
      enabled,
      host,
      port,
      secure,
      user,
      fromName,
      fromEmail: fromEmail || user,
      notifyAppointment,
      notifyPrescription,
      reminderHoursBefore,
    };
    if (pass) data.pass = pass;
    saveMutation.mutate(data);
  }

  async function handleTest() {
    if (!testTo) return;
    setTestStatus('sending');
    setTestError(null);
    try {
      await emailApi.sendTest(testTo);
      setTestStatus('ok');
    } catch (err) {
      setTestStatus('error');
      setTestError(err instanceof ApiError ? err.message : 'Error al enviar el correo de prueba');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Notificaciones por correo</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Envía confirmaciones de citas y recetas médicas a los pacientes vía Gmail SMTP (gratis).
        </p>
      </div>

      {/* Instrucciones */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
          Cómo obtener las credenciales de Gmail SMTP
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-400">
          <li>Activa la <strong>verificación en dos pasos</strong> en tu cuenta de Google.</li>
          <li>Ve a <strong>Cuenta de Google → Seguridad → Contraseñas de aplicación</strong>.</li>
          <li>Crea una nueva contraseña de tipo «Correo» — obtendrás 16 caracteres.</li>
          <li>Pega esos 16 caracteres en el campo <strong>Contraseña de aplicación</strong> de abajo.</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Activar */}
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Habilitar notificaciones por correo"
          description="Cuando está activo, el sistema envía correos automáticos a los pacientes que tienen email registrado."
        />

        {/* Servidor SMTP */}
        <div className="space-y-4">
          <SectionHeading title="Servidor SMTP" description="Parámetros de conexión con Gmail." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Field label="Servidor">
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  required
                />
              </Field>
            </div>
            <Field label="Puerto">
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                min={1}
                max={65535}
                required
              />
            </Field>
            <Field label="Cifrado" hint={secure ? 'SSL/TLS (puerto 465)' : 'STARTTLS (puerto 587)'}>
              <div className="pt-1.5">
                <Toggle
                  checked={secure}
                  onChange={(v) => {
                    setSecure(v);
                    setPort(v ? 465 : 587);
                  }}
                  label={secure ? 'SSL/TLS activo' : 'STARTTLS activo'}
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Credenciales */}
        <div className="space-y-4">
          <SectionHeading title="Credenciales" description="Cuenta de Gmail y contraseña de aplicación." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Correo de Gmail">
              <Input
                type="email"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="tucorreo@gmail.com"
                required
              />
            </Field>
            <Field
              label="Contraseña de aplicación"
              hint="16 caracteres generados en Google. No uses tu contraseña normal."
            >
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder={cfg?.hasPass ? '••••••••••••••••' : 'xxxx xxxx xxxx xxxx'}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        {/* Remitente */}
        <div className="space-y-4">
          <SectionHeading title="Remitente" description="Nombre y dirección que verá el paciente al recibir el correo." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del remitente">
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Consultorio Dental"
                required
              />
            </Field>
            <Field
              label="Correo del remitente"
              hint="Deja en blanco para usar el correo de Gmail."
            >
              <Input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="Igual que el correo de Gmail"
              />
            </Field>
          </div>
        </div>

        {/* Eventos */}
        <div className="space-y-4">
          <SectionHeading title="Eventos a notificar" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <Toggle
                checked={notifyAppointment}
                onChange={setNotifyAppointment}
                label="Citas"
                description="Al crear una cita o al cambiar su estado (confirmada, cancelada, etc.)."
              />
            </div>
            <div className="rounded-xl border border-border p-4">
              <Toggle
                checked={notifyPrescription}
                onChange={setNotifyPrescription}
                label="Recetas médicas"
                description="Al emitir una nueva receta médica para el paciente."
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Solo se envía correo si el paciente tiene una dirección de email registrada en su ficha.
          </p>
        </div>

        {/* Recordatorio de cita */}
        <div className="space-y-4">
          <SectionHeading
            title="Recordatorios automáticos de cita"
            description="El sistema envía correos de recordatorio al paciente antes de la cita. El servidor revisa cada 30 minutos."
          />
          <div className="space-y-2">
            {reminderHoursBefore.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay recordatorios configurados. Agrega uno con el botón de abajo.
              </p>
            )}
            {reminderHoursBefore.map((hours, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <select
                  value={hours}
                  onChange={(e) => {
                    const updated = [...reminderHoursBefore];
                    updated[idx] = Number(e.target.value);
                    setReminderHoursBefore(updated);
                  }}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={1}>1 hora antes</option>
                  <option value={2}>2 horas antes</option>
                  <option value={6}>6 horas antes</option>
                  <option value={12}>12 horas antes</option>
                  <option value={24}>24 horas antes (1 día)</option>
                  <option value={48}>48 horas antes (2 días)</option>
                  <option value={72}>72 horas antes (3 días)</option>
                  <option value={120}>120 horas antes (5 días)</option>
                  <option value={168}>168 horas antes (1 semana)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setReminderHoursBefore(reminderHoursBefore.filter((_, i) => i !== idx))}
                  className="p-2 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                  aria-label="Eliminar recordatorio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setReminderHoursBefore([...reminderHoursBefore, 24])}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar recordatorio
          </button>
          {reminderHoursBefore.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Se enviará un correo por cada recordatorio configurado. Solo pacientes con email registrado recibirán notificaciones.
            </p>
          )}
        </div>

        {/* Feedback + Guardar */}
        {saveError && (
          <p className="text-sm text-danger flex items-center gap-2" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" /> {saveError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          {saveOk && (
            <span className="text-sm text-teal-600 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> Guardado
            </span>
          )}
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </form>

      {/* Correo de prueba */}
      <div className="border-t border-border pt-8 space-y-4">
        <SectionHeading
          title="Correo de prueba"
          description="Verifica que la configuración SMTP funciona enviando un mensaje de prueba."
        />
        <div className="flex gap-3 max-w-lg">
          <Input
            type="email"
            value={testTo}
            onChange={(e) => {
              setTestTo(e.target.value);
              setTestStatus('idle');
            }}
            placeholder="destinatario@ejemplo.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={!testTo || testStatus === 'sending'}
          >
            <Send className="h-4 w-4" />
            {testStatus === 'sending' ? 'Enviando…' : 'Enviar prueba'}
          </Button>
        </div>
        {testStatus === 'ok' && (
          <p className="text-sm text-teal-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Correo enviado correctamente.
          </p>
        )}
        {testStatus === 'error' && (
          <p className="text-sm text-danger flex items-center gap-2" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" /> {testError}
          </p>
        )}
      </div>
    </div>
  );
}
