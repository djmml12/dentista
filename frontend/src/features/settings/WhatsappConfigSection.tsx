import { useState, useEffect, type FormEvent } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { whatsappApi, type WhatsappConfigInput } from './whatsapp.api';

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

export function WhatsappConfigSection() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: whatsappApi.getConfig,
  });

  const [enabled, setEnabled] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [notifyAppointment, setNotifyAppointment] = useState(true);
  const [notifyPrescription, setNotifyPrescription] = useState(true);
  const [appointmentTemplateName, setAppointmentTemplateName] = useState('cita_dental');
  const [prescriptionTemplateName, setPrescriptionTemplateName] = useState('receta_dental');
  const [templateLanguage, setTemplateLanguage] = useState('es_GT');
  const [testTo, setTestTo] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (cfg) {
      setEnabled(cfg.enabled);
      setPhoneNumberId(cfg.phoneNumberId);
      setNotifyAppointment(cfg.notifyAppointment);
      setNotifyPrescription(cfg.notifyPrescription);
      setAppointmentTemplateName(cfg.appointmentTemplateName);
      setPrescriptionTemplateName(cfg.prescriptionTemplateName);
      setTemplateLanguage(cfg.templateLanguage);
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: WhatsappConfigInput) => whatsappApi.saveConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-config'] });
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
    const data: WhatsappConfigInput = {
      enabled,
      phoneNumberId,
      notifyAppointment,
      notifyPrescription,
      appointmentTemplateName,
      prescriptionTemplateName,
      templateLanguage,
    };
    if (accessToken) data.accessToken = accessToken;
    saveMutation.mutate(data);
  }

  async function handleTest() {
    if (!testTo) return;
    setTestStatus('sending');
    setTestError(null);
    try {
      await whatsappApi.sendTest(testTo);
      setTestStatus('ok');
    } catch (err) {
      setTestStatus('error');
      setTestError(err instanceof ApiError ? err.message : 'Error al enviar el mensaje de prueba');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Notificaciones por WhatsApp</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Envía confirmaciones de citas y recetas médicas a los pacientes vía WhatsApp Cloud API (Meta).
        </p>
      </div>

      {/* Instrucciones */}
      <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-3">
        <p className="text-sm font-medium text-green-800 dark:text-green-300">
          Cómo obtener las credenciales de WhatsApp Cloud API
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-green-700 dark:text-green-400">
          <li>Ve a <strong>developers.facebook.com</strong> y crea una app de tipo «Business».</li>
          <li>Agrega el producto <strong>WhatsApp</strong> a tu app.</li>
          <li>En <strong>WhatsApp → Configuración de la API</strong> encontrarás el <strong>ID del número de teléfono</strong> y el <strong>Token de acceso temporal</strong> (válido 24 h) o genera un token permanente desde <strong>Configuración del sistema</strong>.</li>
          <li>Para enviar mensajes a números no registrados necesitas que el número esté en la lista de destinatarios de prueba o haber completado la verificación de negocio.</li>
        </ol>

        <div className="border-t border-green-200 dark:border-green-700 pt-3 mt-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1.5">
            Plantillas que debes crear en Meta Business Manager
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mb-2">
            Los mensajes de negocio requieren plantillas aprobadas. Crea dos en <strong>WhatsApp → Plantillas de mensaje</strong>:
          </p>
          <div className="space-y-2">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/40 p-3 font-mono text-xs text-green-800 dark:text-green-300">
              <p className="font-semibold mb-1">Plantilla de cita (p.ej. «cita_dental»):</p>
              <p>Hola {`{{1}}`}, le recordamos su cita dental el {`{{2}}`} a las {`{{3}}`} con {`{{4}}`}. Estado: {`{{5}}`}.</p>
            </div>
            <div className="rounded-lg bg-green-100 dark:bg-green-900/40 p-3 font-mono text-xs text-green-800 dark:text-green-300">
              <p className="font-semibold mb-1">Plantilla de receta (p.ej. «receta_dental»):</p>
              <p>Hola {`{{1}}`}, su receta del {`{{2}}`} emitida por {`{{3}}`} está disponible en el consultorio.</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Habilitar notificaciones por WhatsApp"
          description="Cuando está activo, el sistema envía mensajes automáticos a los pacientes que tienen teléfono registrado."
        />

        {/* Credenciales */}
        <div className="space-y-4">
          <SectionHeading
            title="Credenciales de la API"
            description="Datos del número de WhatsApp Business configurado en Meta."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID del número de teléfono" hint="Ej. 123456789012345 — lo encuentras en WhatsApp → Configuración de la API.">
              <Input
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="123456789012345"
                required
              />
            </Field>
            <Field
              label="Token de acceso"
              hint="Token temporal (24 h) o permanente generado en Meta."
            >
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={cfg?.hasToken ? '••••••••••••••••' : 'EAAxxxxx…'}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        {/* Plantillas */}
        <div className="space-y-4">
          <SectionHeading
            title="Nombres de plantillas"
            description="Deben coincidir exactamente con los nombres aprobados en Meta Business Manager."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Plantilla de cita">
              <Input
                value={appointmentTemplateName}
                onChange={(e) => setAppointmentTemplateName(e.target.value)}
                placeholder="cita_dental"
                required
              />
            </Field>
            <Field label="Plantilla de receta">
              <Input
                value={prescriptionTemplateName}
                onChange={(e) => setPrescriptionTemplateName(e.target.value)}
                placeholder="receta_dental"
                required
              />
            </Field>
            <Field label="Idioma de plantilla" hint="Ej. es_GT, es_ES, en_US">
              <Input
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
                placeholder="es_GT"
                required
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
            Solo se envía mensaje si el paciente tiene un número de teléfono registrado en su ficha.
          </p>
        </div>

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

      {/* Mensaje de prueba */}
      <div className="border-t border-border pt-8 space-y-4">
        <SectionHeading
          title="Mensaje de prueba"
          description="Envía el mensaje hello_world (pre-aprobado por Meta) para verificar que las credenciales funcionan."
        />
        <div className="flex gap-3 max-w-lg">
          <Input
            type="tel"
            value={testTo}
            onChange={(e) => {
              setTestTo(e.target.value);
              setTestStatus('idle');
            }}
            placeholder="+521234567890"
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
        <p className="text-xs text-muted-foreground">
          Ingresa el número en formato internacional: +52 seguido de 10 dígitos para México.
        </p>
        {testStatus === 'ok' && (
          <p className="text-sm text-teal-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Mensaje enviado correctamente.
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
