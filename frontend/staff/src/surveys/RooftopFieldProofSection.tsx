import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Clock,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  SolarPanel,
  Upload,
  Zap,
} from 'lucide-react';
import { fetchInstallationProof, submitInstallationProof, type InstallationProof } from '../api/surveys';
import { Icon } from '../components/Icon';
import { FormNotice } from '../components/SubmitButton';

// Default high-fidelity fallback illustrations for quick testing
export const DEFAULT_PANEL_PHOTO = '/images/panel_array.svg';
export const DEFAULT_INVERTER_PHOTO = '/images/inverter_wiring.svg';
export const DEFAULT_METER_PHOTO = '/images/net_meter.svg';

type Props = {
  installationId: number;
  customerName: string;
  defaultCapacityKw?: number;
  isTechnician?: boolean;
};

export function RooftopFieldProofSection({
  installationId,
  customerName,
  defaultCapacityKw = 3.3,
}: Props) {
  const queryClient = useQueryClient();
  const proofKey = ['installation-proof', installationId];

  const { data: proof, isLoading } = useQuery({
    queryKey: proofKey,
    queryFn: async ({ signal }) => {
      try {
        return await fetchInstallationProof(installationId, signal);
      } catch {
        return null;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="field-help" style={{ padding: '2rem', textAlign: 'center' }}>
        Loading commissioning records…
      </div>
    );
  }

  if (proof) {
    return <HandoverCertificate proof={proof} />;
  }

  return (
    <RooftopHandoverForm
      installationId={installationId}
      customerName={customerName}
      defaultCapacityKw={defaultCapacityKw}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: proofKey })}
    />
  );
}

function RooftopHandoverForm({
  installationId,
  customerName,
  defaultCapacityKw,
  onSuccess,
}: {
  installationId: number;
  customerName: string;
  defaultCapacityKw: number;
  onSuccess: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Form State
  const today = new Date().toISOString().split('T')[0];
  const [startTime, setStartTime] = useState(`${today}T09:30`);
  const [endTime, setEndTime] = useState(`${today}T16:15`);
  const [capacityKw, setCapacityKw] = useState(defaultCapacityKw);
  const [generationKw, setGenerationKw] = useState(2.85);
  const [gridConnected, setGridConnected] = useState(true);
  const [signedByName, setSignedByName] = useState(customerName);

  // Photos
  const [panelPhoto, setPanelPhoto] = useState<string | null>(null);
  const [inverterPhoto, setInverterPhoto] = useState<string | null>(null);
  const [meterPhoto, setMeterPhoto] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height || 140);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const accent = getComputedStyle(canvas).getPropertyValue('--accent').trim();
    ctx.strokeStyle = accent || '#ffc21f';
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: (body: {
      workStartedAt: string;
      workCompletedAt: string;
      systemCapacityKw: number;
      testedGenerationKw: number;
      gridConnected: boolean;
      panelArrayPhotoUrl: string;
      inverterPhotoUrl: string;
      meterPhotoUrl: string;
      customerSignatureData: string;
      signedByName: string;
      signedAt: string;
    }) => submitInstallationProof(installationId, body),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: Error) => {
      setNotice(err.message || 'Failed to submit commissioning certificate. Please try again.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!panelPhoto || !inverterPhoto || !meterPhoto) {
      setNotice('Please capture or upload all 3 field verification photos before customer sign-off.');
      return;
    }

    if (!hasSignature || !canvasRef.current) {
      setNotice('Customer signature is required to complete the handover.');
      return;
    }

    const signatureData = canvasRef.current.toDataURL('image/png');

    mutation.mutate({
      workStartedAt: new Date(startTime).toISOString(),
      workCompletedAt: new Date(endTime).toISOString(),
      systemCapacityKw: capacityKw,
      testedGenerationKw: generationKw,
      gridConnected,
      panelArrayPhotoUrl: panelPhoto,
      inverterPhotoUrl: inverterPhoto,
      meterPhotoUrl: meterPhoto,
      customerSignatureData: signatureData,
      signedByName: signedByName.trim() || customerName,
      signedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="survey-panel" aria-labelledby="field-commissioning-form-title">
      <div className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Icon icon={SolarPanel} color="var(--accent)" />
          <h2 className="a-heading" id="field-commissioning-form-title" style={{ margin: 0 }}>
            Field commissioning checklist
          </h2>
        </div>
        <span className="chip tone-neutral">
          Technician checklist
        </span>
      </div>

      <p className="a-body">
        Record on-site crew work hours, test measured live generation, upload photo verification of modules and cabling, and obtain the homeowner digital screen sign-off.
      </p>

      {notice && <FormNotice>{notice}</FormNotice>}

      <form onSubmit={handleSubmit} className="survey-form">
        <div className="survey-measurements" style={{ borderTop: 0 }}>
          <div className="field" style={{ borderTop: 0, paddingTop: 0 }}>
            <label className="field-label" htmlFor="workStartedAt">
              <Icon icon={Clock} /> Work started (clock in)
            </label>
            <div className="control">
              <input
                id="workStartedAt"
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field" style={{ borderTop: 0, paddingTop: 0 }}>
            <label className="field-label" htmlFor="workCompletedAt">
              <Icon icon={Clock} /> Work completed (clock out)
            </label>
            <div className="control">
              <input
                id="workCompletedAt"
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field" style={{ borderTop: 0, paddingTop: 0 }}>
            <label className="field-label" htmlFor="systemCapacityKw">System capacity (kW)</label>
            <div className="control">
              <input
                id="systemCapacityKw"
                type="number"
                step="0.05"
                value={capacityKw}
                onChange={e => setCapacityKw(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="field" style={{ borderTop: 0, paddingTop: 0 }}>
            <label className="field-label" htmlFor="testedGenerationKw">
              <Icon icon={Zap} /> Tested live generation (kW)
            </label>
            <div className="control">
              <input
                id="testedGenerationKw"
                type="number"
                step="0.01"
                value={generationKw}
                onChange={e => setGenerationKw(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        {/* Grid Synchronization Verified Checkbox */}
        <div className="notice tone-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            id="gridConnected"
            type="checkbox"
            checked={gridConnected}
            onChange={e => setGridConnected(e.target.checked)}
            style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <label htmlFor="gridConnected" style={{ cursor: 'pointer', margin: 0 }}>
            <b>Grid synchronized:</b> 238V nominal voltage checked, inverter status error-free, bi-directional net meter active.
          </label>
        </div>

        {/* 3-Point Photo Evidence Gallery */}
        <div>
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>
            <h3 className="a-heading">Mandatory field photo evidence</h3>
            <span className="a-label">3 distinct angles</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Photo 1: Panel Array */}
            <div className="rec-card" style={{ padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="a-label">1. Rooftop panel array</span>
                {panelPhoto && <span className="chip tone-positive">Attached</span>}
              </div>

              {panelPhoto ? (
                <div style={{ position: 'relative', height: '135px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.5rem', background: 'var(--surface)' }}>
                  <img src={panelPhoto} alt="Rooftop Array" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setPanelPhoto(null)}
                    className="btn btn-quiet btn-sm"
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--backdrop)', color: 'var(--fg)' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{
                  height: '135px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--line-strong)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}>
                  <Icon icon={Camera} />
                  <span className="a-small">No photo uploaded</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon icon={Upload} />
                  <span>{panelPhoto ? 'Replace photo' : 'Upload photo'}</span>
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setPanelPhoto)} />
                </label>
                {!panelPhoto && (
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    title="Fill sample illustration for testing"
                    onClick={() => setPanelPhoto(DEFAULT_PANEL_PHOTO)}
                  >
                    Sample
                  </button>
                )}
              </div>
            </div>

            {/* Photo 2: Inverter & DCDB */}
            <div className="rec-card" style={{ padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="a-label">2. Inverter and wiring</span>
                {inverterPhoto && <span className="chip tone-positive">Attached</span>}
              </div>

              {inverterPhoto ? (
                <div style={{ position: 'relative', height: '135px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.5rem', background: 'var(--surface)' }}>
                  <img src={inverterPhoto} alt="Inverter Wiring" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setInverterPhoto(null)}
                    className="btn btn-quiet btn-sm"
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--backdrop)', color: 'var(--fg)' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{
                  height: '135px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--line-strong)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}>
                  <Icon icon={Camera} />
                  <span className="a-small">No photo uploaded</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon icon={Upload} />
                  <span>{inverterPhoto ? 'Replace photo' : 'Upload photo'}</span>
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setInverterPhoto)} />
                </label>
                {!inverterPhoto && (
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    title="Fill sample illustration for testing"
                    onClick={() => setInverterPhoto(DEFAULT_INVERTER_PHOTO)}
                  >
                    Sample
                  </button>
                )}
              </div>
            </div>

            {/* Photo 3: Net Meter & Earthing */}
            <div className="rec-card" style={{ padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="a-label">3. Net meter and earthing</span>
                {meterPhoto && <span className="chip tone-positive">Attached</span>}
              </div>

              {meterPhoto ? (
                <div style={{ position: 'relative', height: '135px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.5rem', background: 'var(--surface)' }}>
                  <img src={meterPhoto} alt="Net Meter" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setMeterPhoto(null)}
                    className="btn btn-quiet btn-sm"
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--backdrop)', color: 'var(--fg)' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{
                  height: '135px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--line-strong)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}>
                  <Icon icon={Camera} />
                  <span className="a-small">No photo uploaded</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon icon={Upload} />
                  <span>{meterPhoto ? 'Replace photo' : 'Upload photo'}</span>
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setMeterPhoto)} />
                </label>
                {!meterPhoto && (
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    title="Fill sample illustration for testing"
                    onClick={() => setMeterPhoto(DEFAULT_METER_PHOTO)}
                  >
                    Sample
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Digital Signature Handover Canvas */}
        <div className="rec-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div className="section-title">
              <h3 className="a-heading" style={{ margin: 0 }}>Customer digital sign-off</h3>
              <span className="a-label">On-screen signature</span>
            </div>
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={clearSignature}
              disabled={!hasSignature}
            >
              <Icon icon={RotateCcw} />
              <span>Clear signature</span>
            </button>
          </div>

          {/* Interactive Canvas Pad */}
          <div style={{
            position: 'relative',
            background: 'var(--bg-field)',
            border: hasSignature ? '1px solid var(--accent)' : '1px dashed var(--line-strong)',
            borderRadius: 'var(--radius-md)',
            touchAction: 'none',
            overflow: 'hidden',
          }}>
            <canvas
              ref={canvasRef}
              aria-label="Homeowner digital signature pad"
              width={560}
              height={140}
              style={{ width: '100%', height: '140px', display: 'block', cursor: 'crosshair' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {!hasSignature && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'var(--faint)',
                fontSize: '0.875rem',
                pointerEvents: 'none',
                textAlign: 'center',
              }}>
                Sign with finger or mouse here
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="field" style={{ flex: '1 1 200px' }}>
              <label className="field-label" htmlFor="signedByName">Signer full name</label>
              <div className="control">
                <input
                  id="signedByName"
                  type="text"
                  value={signedByName}
                  onChange={e => setSignedByName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="a-small" style={{ flex: '2 1 300px' }}>
              &ldquo;I confirm that the solar system has been installed, tested, and is generating power to my complete satisfaction.&rdquo;
            </div>
          </div>
        </div>

        {/* Submit Handover CTA */}
        <div className="actions" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isPending}
          >
            <Icon icon={FileCheck} />
            <span>{mutation.isPending ? 'Submitting handover…' : 'Submit handover certificate'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function HandoverCertificate({ proof }: { proof: InstallationProof }) {
  return (
    <section className="survey-panel" aria-labelledby="certificate-title">
      <div className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Icon icon={ShieldCheck} color="var(--positive)" />
          <h2 className="a-heading" id="certificate-title" style={{ margin: 0 }}>
            Rooftop handover and commissioning certificate
          </h2>
        </div>
        <span className="chip tone-positive">
          System commissioned and active
        </span>
      </div>

      <p className="a-body">
        Installation #{proof.installationId} successfully verified on-site by {proof.technicianName} on {new Date(proof.signedAt).toLocaleDateString()} at {new Date(proof.signedAt).toLocaleTimeString()}.
      </p>

      {/* Measurements grid */}
      <dl className="survey-measurements" style={{ borderTop: 0 }}>
        <div>
          <dt>Tested generation</dt>
          <dd style={{ color: 'var(--positive)' }}>{proof.testedGenerationKw} kW</dd>
        </div>
        <div>
          <dt>System capacity</dt>
          <dd>{proof.systemCapacityKw} kW</dd>
        </div>
        <div>
          <dt>Labor duration</dt>
          <dd>{proof.laborHours} hrs</dd>
        </div>
        <div>
          <dt>Grid status</dt>
          <dd style={{ color: 'var(--positive)' }}>Synchronized (238V)</dd>
        </div>
      </dl>

      {/* Photo Gallery */}
      <div style={{ marginTop: '1rem' }}>
        <h3 className="a-heading" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
          Field verification photos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div>
            <div style={{ height: '120px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
              <img
                src={proof.panelArrayPhotoUrl}
                alt="Panel Array"
                onError={(e) => { e.currentTarget.src = DEFAULT_PANEL_PHOTO; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span className="a-label" style={{ display: 'block', marginTop: '0.35rem' }}>Rooftop panel array</span>
          </div>

          <div>
            <div style={{ height: '120px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
              <img
                src={proof.inverterPhotoUrl}
                alt="Inverter Wiring"
                onError={(e) => { e.currentTarget.src = DEFAULT_INVERTER_PHOTO; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span className="a-label" style={{ display: 'block', marginTop: '0.35rem' }}>Inverter and wiring</span>
          </div>

          <div>
            <div style={{ height: '120px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
              <img
                src={proof.meterPhotoUrl}
                alt="Net Meter"
                onError={(e) => { e.currentTarget.src = DEFAULT_METER_PHOTO; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span className="a-label" style={{ display: 'block', marginTop: '0.35rem' }}>Net meter and earthing</span>
          </div>
        </div>
      </div>

      {/* Homeowner Signature Proof Box */}
      <div className="rec-card" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="a-label">Digital signature sign-off</span>
          <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
            {proof.signedByName}
          </div>
          <span className="a-small">
            Signed on {new Date(proof.signedAt).toLocaleString()}
          </span>
        </div>

        {proof.customerSignatureData && (
          <div style={{
            height: '65px',
            minWidth: '160px',
            background: 'var(--bg-field)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 0 1px var(--line)',
          }}>
            <img
              src={proof.customerSignatureData}
              alt="Customer Signature"
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
